"""
Agent 纯调度器
只负责任务规划和 Skill 调用，不执行具体任务
"""
import json
import re
from typing import Dict, List, Any, Optional, AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from app.services.ollama_client import ollama_client
from app.skills.registry import skill_registry, SkillResult


@dataclass
class AgentStep:
    """Agent 执行步骤"""
    step_number: int
    skill_name: str
    params: Dict[str, Any]
    reasoning: str = ""
    result: Optional[SkillResult] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AgentTask:
    """Agent 任务"""
    task_id: str
    description: str
    context: Dict[str, Any] = field(default_factory=dict)
    steps: List[AgentStep] = field(default_factory=list)
    final_result: str = ""
    status: str = "pending"  # pending, running, completed, failed
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class Agent:
    """
    Agent 纯调度器
    
    职责：
    1. 分析用户需求
    2. 规划任务步骤
    3. 调用 Skills 执行
    4. 汇总结果
    
    不执行具体任务，只负责调度
    """
    
    def __init__(self):
        self.tasks: Dict[str, AgentTask] = {}
        self.system_prompt = self._load_system_prompt()
    
    def _load_system_prompt(self) -> str:
        """加载系统提示词"""
        prompt_path = Path(__file__).parent / "prompts" / "system.md"
        if prompt_path.exists():
            content = prompt_path.read_text(encoding='utf-8')
            # 移除 markdown 标题标记
            content = re.sub(r'^# .*\n', '', content)
            return content.strip()
        return "你是任务调度助手。"
    
    def _build_planning_prompt(self, description: str, context: Dict) -> str:
        """构建任务规划提示词"""
        # 获取可用 Skills
        skills = skill_registry.list_skills()
        skills_info = json.dumps(skills, ensure_ascii=False, indent=2)
        
        # 替换系统提示词中的变量
        prompt = self.system_prompt.replace("{{skills_list}}", skills_info)
        
        # 添加当前任务信息
        prompt += f"""

## 当前任务

用户请求: {description}

上下文: {json.dumps(context, ensure_ascii=False)}

请输出任务规划（JSON格式）：
{{
  "steps": [
    {{
      "skill": "skill_name",
      "params": {{...}},
      "reason": "原因说明"
    }}
  ],
  "summary": "任务摘要"
}}
"""
        return prompt
    
    async def plan_task(self, description: str, context: Dict = None) -> List[AgentStep]:
        """
        规划任务步骤
        
        使用 LLM 分析任务并规划需要执行的 Skills
        """
        prompt = self._build_planning_prompt(description, context or {})
        
        print(f"[Agent] 规划任务: {description[:100]}...")
        
        messages = [
            {"role": "system", "content": "你是任务规划助手，擅长将复杂任务分解为可执行的步骤。只输出JSON格式的规划。"},
            {"role": "user", "content": prompt}
        ]
        
        # 调用 LLM 进行规划
        response_text = ""
        async for chunk in ollama_client.chat(messages, stream=False):
            response_text += chunk
        
        print(f"[Agent] LLM 规划结果: {response_text[:500]}...")
        
        # 解析规划结果
        try:
            # 提取 JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                plan_json = json_match.group()
                plan = json.loads(plan_json)
            else:
                plan = json.loads(response_text)
            
            steps = []
            for i, step_data in enumerate(plan.get("steps", [])):
                steps.append(AgentStep(
                    step_number=i + 1,
                    skill_name=step_data["skill"],
                    params=step_data.get("params", {}),
                    reasoning=step_data.get("reason", "")
                ))
            
            print(f"[Agent] 规划成功: {len(steps)} 个步骤")
            for step in steps:
                print(f"  - {step.skill_name}: {step.params}")
            
            return steps
        
        except Exception as e:
            print(f"[Agent] 规划解析失败: {e}, 使用默认步骤")
            # 解析失败，返回默认步骤
            return [AgentStep(
                step_number=1,
                skill_name="llm_chat",
                params={"message": description},
                reasoning="直接询问LLM"
            )]
    
    async def execute_task(
        self,
        task_id: str,
        description: str,
        context: Dict = None
    ) -> AsyncGenerator[str, None]:
        """
        执行任务
        
        流式返回执行过程和结果
        """
        # 创建任务
        task = AgentTask(
            task_id=task_id,
            description=description,
            context=context or {}
        )
        self.tasks[task_id] = task
        task.status = "running"
        
        yield f"🤔 正在分析任务: {description}\n"
        
        try:
            # 阶段1: 规划任务
            yield "📋 规划执行步骤...\n"
            steps = await self.plan_task(description, context)
            task.steps = steps
            
            yield f"✅ 规划完成，共 {len(steps)} 个步骤\n"
            
            # 阶段2: 执行每个步骤
            previous_results = {}  # 存储前面步骤的结果
            
            for step in steps:
                yield f"\n🔧 步骤 {step.step_number}: {step.skill_name}\n"
                yield f"   原因: {step.reasoning}\n"
                
                # 构建参数，将前面步骤的结果传递给当前步骤
                params = step.params.copy()
                
                # 如果有上一步的结果，添加到参数中
                if previous_results:
                    # 对于 llm_chat，把前面步骤的结果添加到 message 中
                    if step.skill_name == "llm_chat" and "message" in params:
                        context_info = "\n\n【上下文信息】\n"
                        for prev_step_num, prev_result in previous_results.items():
                            if prev_result.get("success"):
                                context_info += f"步骤 {prev_step_num} 结果:\n"
                                if isinstance(prev_result.get("data"), dict):
                                    # 提取关键信息
                                    data = prev_result["data"]
                                    if "analysis" in data:
                                        context_info += f"{data['analysis'][:1000]}...\n"
                                    elif "content" in data:
                                        context_info += f"{data['content'][:1000]}...\n"
                                    elif "description" in data:
                                        context_info += f"{data['description'][:1000]}...\n"
                                    else:
                                        context_info += f"{str(data)[:1000]}...\n"
                                else:
                                    context_info += f"{str(prev_result['data'])[:1000]}...\n"
                        params["message"] = context_info + "\n\n【用户问题】\n" + params["message"]
                
                # 调用 Skill
                result = await skill_registry.invoke(
                    step.skill_name,
                    **params
                )
                step.result = result
                
                # 保存结果供后续步骤使用
                if result.success:
                    previous_results[step.step_number] = {
                        "success": True,
                        "data": result.data
                    }
                
                if result.success:
                    yield "   ✅ 成功\n"
                    # 显示结果摘要
                    data_str = str(result.data)
                    if len(data_str) > 200:
                        yield f"   结果: {data_str[:200]}...\n"
                    else:
                        yield f"   结果: {data_str}\n"
                else:
                    yield f"   ❌ 失败: {result.error}\n"
            
            # 阶段3: 生成最终结果
            yield "\n📝 生成最终结果...\n"
            final_result = await self._generate_final_result(task)
            task.final_result = final_result
            task.status = "completed"
            task.completed_at = datetime.now()
            
            yield f"\n✨ 任务完成!\n\n{final_result}\n"
        
        except Exception as e:
            task.status = "failed"
            task.final_result = f"任务执行失败: {str(e)}"
            yield f"\n❌ 任务失败: {str(e)}\n"
    
    async def _generate_final_result(self, task: AgentTask) -> str:
        """
        生成最终结果
        
        基于所有步骤的执行结果，生成结构化报告
        """
        # 收集执行结果，简化数据结构
        content_analysis = ""
        
        for step in task.steps:
            if step.result and step.result.success:
                if step.skill_name == "content_extract":
                    # 提取 content_extract 的关键信息
                    data = step.result.data
                    if isinstance(data, dict):
                        if "analysis" in data:
                            content_analysis = data["analysis"]
                        elif "content" in data:
                            content_analysis = data["content"]
                        elif "description" in data:
                            content_analysis = data["description"]
                        elif "extracted_text" in data:
                            content_analysis = data["extracted_text"]
                        else:
                            # 尝试组合所有文本内容
                            parts = []
                            for key, value in data.items():
                                if isinstance(value, str) and len(value) > 50:
                                    parts.append(f"{key}: {value[:500]}")
                            content_analysis = "\n".join(parts)
                elif step.skill_name == "llm_chat":
                    # 如果 llm_chat 有结果，直接使用
                    if isinstance(step.result.data, dict) and "response" in step.result.data:
                        return step.result.data["response"]
        
        # 构建结果生成提示词
        if content_analysis:
            prompt = f"""基于以下内容分析，请对作业进行评分和评价。

原始任务: {task.description}

提取的内容:
{content_analysis[:2000]}

请生成一个完整的评分报告，包含：
1. 总体评价（对内容质量的总体看法）
2. 主要发现（内容亮点、完整性、创新性等）
3. 具体评分（满分100分，给出各维度评分和总分）
4. 改进建议

请以结构化格式回答。"""
        else:
            # 没有提取到内容
            prompt = f"""基于以下执行步骤的结果，生成最终回答。

原始任务: {task.description}

执行步骤:
"""
            for step in task.steps:
                if step.result:
                    prompt += f"\n步骤 {step.step_number} ({step.skill_name}):"
                    if step.result.success:
                        prompt += f"\n成功: {str(step.result.data)[:500]}"
                    else:
                        prompt += f"\n失败: {step.result.error}"
            
            prompt += "\n\n请生成一个完整的、结构化的回答。如果是审查/分析任务，请包含：\n1. 总体评价\n2. 主要发现\n3. 建议\n\n回答:"
        
        messages = [
            {"role": "system", "content": "你是专业的作业评分助手，擅长分析内容质量并给出客观评价。"},
            {"role": "user", "content": prompt}
        ]
        
        response_text = ""
        async for chunk in ollama_client.chat(messages, stream=False):
            response_text += chunk
        
        return response_text.strip()
    
    def get_task(self, task_id: str) -> Optional[AgentTask]:
        """获取任务状态"""
        return self.tasks.get(task_id)
    
    def list_tasks(self) -> List[Dict]:
        """列出所有任务"""
        return [
            {
                "task_id": t.task_id,
                "description": t.description,
                "status": t.status,
                "step_count": len(t.steps),
                "created_at": t.created_at.isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None
            }
            for t in self.tasks.values()
        ]


# 全局 Agent 实例
agent = Agent()
