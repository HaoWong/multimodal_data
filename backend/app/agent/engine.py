"""
Agent执行引擎
支持技能编排和RAG增强
"""
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime
import json
import os

from app.skills import skill_registry, SkillResult
from app.services.ollama_client import ollama_client


# 上传文件存储路径
UPLOAD_DIRS = [
    "uploads/images",
    "uploads/contents",
    "uploads/documents",
]


def find_uploaded_file(filename: str) -> Optional[str]:
    """
    根据文件名查找上传文件的完整路径
    
    Args:
        filename: 文件名（如 "DSC02874.JPG"）
    
    Returns:
        完整路径或 None
    """
    # 如果已经是完整路径，直接返回
    if os.path.exists(filename):
        return filename
    
    # 在各个上传目录中查找
    for upload_dir in UPLOAD_DIRS:
        if not os.path.exists(upload_dir):
            continue
        
        # 直接查找
        full_path = os.path.join(upload_dir, filename)
        if os.path.exists(full_path):
            return full_path
        
        # 递归查找子目录
        for root, dirs, files in os.walk(upload_dir):
            if filename in files:
                return os.path.join(root, filename)
    
    return None


@dataclass
class AgentStep:
    """Agent执行步骤"""
    step_number: int
    skill_name: str
    params: Dict[str, Any]
    result: Optional[SkillResult] = None
    reasoning: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AgentTask:
    """Agent任务"""
    task_id: str
    description: str
    context: Dict[str, Any] = field(default_factory=dict)
    steps: List[AgentStep] = field(default_factory=list)
    final_result: str = ""
    status: str = "pending"  # pending, running, completed, failed
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class AgentEngine:
    """Agent执行引擎"""
    
    def __init__(self):
        self.tasks: Dict[str, AgentTask] = {}
    
    async def plan_task(self, description: str, context: Dict = None) -> List[AgentStep]:
        """
        规划任务步骤
        使用LLM分析任务并规划需要执行的skills
        """
        # 获取可用skills
        available_skills = skill_registry.list_skills()
        skills_info = json.dumps([{
            "name": s["name"],
            "description": s["description"],
            "parameters": s["parameters"]
        } for s in available_skills], ensure_ascii=False, indent=2)
        
        # 构建规划prompt
        prompt = f"""你是一个任务规划助手。请分析以下任务，并规划执行步骤。

可用技能:
{skills_info}

任务描述: {description}

上下文: {json.dumps(context or {}, ensure_ascii=False)}

请按以下格式返回执行计划（JSON格式）:
{{
    "steps": [
        {{
            "skill_name": "技能名称",
            "params": {{参数}},
            "reasoning": "为什么使用这个技能"
        }}
    ]
}}

注意:
1. 只使用上面列出的技能
2. 参数必须匹配技能的参数定义
3. 如果任务需要RAG检索，请使用vector_search技能
4. 如果任务需要生成内容，请使用llm_chat技能
"""
        
        # 调用LLM进行规划
        messages = [
            {"role": "system", "content": "你是一个任务规划助手，擅长将复杂任务分解为可执行的步骤。"},
            {"role": "user", "content": prompt}
        ]
        
        response_text = ""
        async for chunk in ollama_client.chat(messages, stream=False):
            response_text += chunk
        
        # 解析规划结果
        try:
            # 尝试提取JSON
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                plan_json = response_text[json_start:json_end]
                plan = json.loads(plan_json)
            else:
                plan = json.loads(response_text)
            
            steps = []
            for i, step_data in enumerate(plan.get("steps", [])):
                steps.append(AgentStep(
                    step_number=i + 1,
                    skill_name=step_data["skill_name"],
                    params=step_data.get("params", {}),
                    reasoning=step_data.get("reasoning", "")
                ))
            
            return steps
        except Exception:
            # 如果解析失败，返回简单的默认步骤
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
            # 规划任务
            steps = await self.plan_task(description, context)
            task.steps = steps
            
            yield f"📋 任务规划完成，共{len(steps)}个步骤\n"
            
            # 执行每个步骤
            for step in steps:
                yield f"\n🔧 步骤 {step.step_number}: {step.skill_name}\n"
                yield f"   原因: {step.reasoning}\n"
                
                # 处理文件路径参数（自动查找上传的文件）
                processed_params = self._process_file_params(step.params)
                
                # 调用skill
                result = await skill_registry.invoke(step.skill_name, **processed_params)
                step.result = result
                
                if result.success:
                    yield "   ✅ 成功\n"
                    if isinstance(result.data, str):
                        data_str = str(result.data)
                        yield f"   结果: {data_str[:200]}...\n" if len(data_str) > 200 else f"   结果: {data_str}\n"
                else:
                    yield f"   ❌ 失败: {result.error}\n"
            
            # 生成最终结果
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
        """生成最终结果"""
        # 构建结果生成prompt
        steps_info = []
        for step in task.steps:
            if step.result and step.result.success:
                steps_info.append({
                    "skill": step.skill_name,
                    "result": step.result.data
                })
        
        prompt = f"""基于以下执行步骤的结果，生成最终回答。

原始任务: {task.description}

执行步骤:
{json.dumps(steps_info, ensure_ascii=False, indent=2)}

请生成一个完整的、结构化的回答。如果是审查/分析任务，请包含：
1. 总体评价
2. 主要发现
3. 建议

回答:"""
        
        messages = [
            {"role": "system", "content": "你是一个结果汇总助手，擅长整合多个步骤的输出生成最终报告。"},
            {"role": "user", "content": prompt}
        ]
        
        response_text = ""
        async for chunk in ollama_client.chat(messages, stream=False):
            response_text += chunk
        
        return response_text.strip()
    
    def get_task(self, task_id: str) -> Optional[AgentTask]:
        """获取任务状态"""
        return self.tasks.get(task_id)
    
    def _process_file_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理参数中的文件路径，自动查找上传目录中的文件
        
        对于 image_path, video_path, file_path 等参数，如果是文件名而不是完整路径，
        则自动在上传目录中查找并转换为完整路径
        """
        processed = params.copy()
        
        # 可能包含文件路径的参数名
        file_path_params = ['image_path', 'video_path', 'file_path', 'path', 'filepath']
        
        for param_name in file_path_params:
            if param_name in processed:
                original_path = processed[param_name]
                # 如果不是完整路径（不包含目录分隔符），则尝试查找
                if original_path and not os.path.dirname(original_path):
                    full_path = find_uploaded_file(original_path)
                    if full_path:
                        processed[param_name] = full_path
                        print(f"[Agent] 文件路径解析: {original_path} -> {full_path}")
        
        return processed


# 全局Agent引擎实例
agent_engine = AgentEngine()
