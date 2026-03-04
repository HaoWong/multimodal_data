"""
Agent执行引擎
支持技能编排和RAG增强

使用统一任务执行引擎进行步骤执行
Agent只负责任务规划
"""
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime
import json
import os
import uuid

from app.skills import skill_registry
from app.skills.registry import SkillResult as TaskResult
from app.services.ollama_client import ollama_client
from app.core.task_engine import (
    TaskContext,
    TaskStatus,
    task_engine,
    create_task_context,
    create_execution_config,
)


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
    result: Optional[TaskResult] = None
    reasoning: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    execution_time: float = 0.0
    status: str = "pending"  # pending, running, completed, failed
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "step_number": self.step_number,
            "skill_name": self.skill_name,
            "params": self.params,
            "result": self.result.to_dict() if self.result else None,
            "reasoning": self.reasoning,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "execution_time": self.execution_time,
            "status": self.status,
        }


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
    total_execution_time: float = 0.0
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "task_id": self.task_id,
            "description": self.description,
            "context": self.context,
            "steps": [step.to_dict() for step in self.steps],
            "final_result": self.final_result,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "total_execution_time": self.total_execution_time,
        }


class AgentEngine:
    """
    Agent执行引擎
    
    职责：
    - 任务规划（使用LLM分析任务并规划步骤）
    - 步骤执行（通过统一任务执行引擎）
    - 结果汇总
    
    步骤执行完全复用统一执行引擎
    """
    
    def __init__(self):
        self.tasks: Dict[str, AgentTask] = {}
        self._default_timeout = 300.0  # 默认超时5分钟
    
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
    
    async def _execute_step(
        self,
        step: AgentStep,
        task_context: TaskContext
    ) -> TaskResult:
        """
        执行单个步骤
        
        使用统一任务执行引擎执行
        """
        step.status = "running"
        step_start_time = datetime.now()
        
        # 处理文件路径参数
        processed_params = self._process_file_params(step.params)
        
        # 获取skill信息
        skill = skill_registry.get(step.skill_name)
        if not skill:
            step.status = "failed"
            step.execution_time = (datetime.now() - step_start_time).total_seconds()
            return TaskResult.error_result(
                error=f"Skill not found: {step.skill_name}",
                error_type="SkillNotFoundError"
            )
        
        # 过滤参数：只保留 skill 需要的参数
        if skill.metadata.parameters:
            allowed_params = {p.name for p in skill.metadata.parameters}
            filtered_params = {k: v for k, v in processed_params.items() if k in allowed_params}
        else:
            filtered_params = processed_params
        
        # 创建步骤执行上下文
        step_context = create_task_context(
            task_name=f"{task_context.task_name}:step_{step.step_number}",
            task_type="agent_step",
            params=filtered_params,
            parent_task_id=task_context.task_id,
        )
        
        # 使用统一执行引擎执行
        # 优先使用skill自身的配置
        config = create_execution_config(
            timeout=skill.metadata.timeout or self._default_timeout,
            max_retries=skill.metadata.max_retries,
            retry_delay=skill.metadata.retry_delay,
        )
        
        result = await task_engine.execute(
            func=skill.execute,
            context=step_context,
            config=config,
            **filtered_params
        )
        
        # 更新步骤状态
        step.result = result
        step.execution_time = (datetime.now() - step_start_time).total_seconds()
        step.status = "completed" if result.success else "failed"
        
        return result
    
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
        
        # 创建Agent任务上下文
        agent_context = create_task_context(
            task_name=f"agent_task:{task_id}",
            task_type="agent",
            params={"description": description, "context": context},
        )
        
        yield f"🤔 正在分析任务: {description}\n"
        
        task_start_time = datetime.now()
        
        try:
            # 规划任务
            steps = await self.plan_task(description, context)
            task.steps = steps
            
            yield f"📋 任务规划完成，共{len(steps)}个步骤\n"
            
            # 执行每个步骤
            for step in steps:
                yield f"\n🔧 步骤 {step.step_number}: {step.skill_name}\n"
                yield f"   原因: {step.reasoning}\n"
                
                # 使用统一执行引擎执行步骤
                result = await self._execute_step(step, agent_context)
                
                if result.success:
                    yield "   ✅ 成功\n"
                    if isinstance(result.data, str):
                        data_str = str(result.data)
                        yield f"   结果: {data_str[:200]}...\n" if len(data_str) > 200 else f"   结果: {data_str}\n"
                else:
                    yield f"   ❌ 失败: {result.error}\n"
                    # Skill 执行失败，停止执行并标记任务失败
                    task.status = "failed"
                    task.final_result = f"步骤 {step.step_number} ({step.skill_name}) 执行失败: {result.error}"
                    task.completed_at = datetime.now()
                    task.total_execution_time = (datetime.now() - task_start_time).total_seconds()
                    yield f"\n❌ 任务失败: 步骤 {step.step_number} 执行失败\n"
                    return
            
            # 生成最终结果
            yield "\n📝 生成最终结果...\n"
            final_result = await self._generate_final_result(task)
            task.final_result = final_result
            task.status = "completed"
            task.completed_at = datetime.now()
            task.total_execution_time = (datetime.now() - task_start_time).total_seconds()
            
            yield f"\n✨ 任务完成!\n\n{final_result}\n"
            
        except Exception as e:
            task.status = "failed"
            task.final_result = f"任务执行失败: {str(e)}"
            task.completed_at = datetime.now()
            task.total_execution_time = (datetime.now() - task_start_time).total_seconds()
            yield f"\n❌ 任务失败: {str(e)}\n"
    
    async def execute_task_sync(
        self,
        task_id: str,
        description: str,
        context: Dict = None
    ) -> TaskResult:
        """
        同步执行任务（非流式）
        
        返回统一格式的TaskResult
        """
        # 收集所有输出
        outputs = []
        async for chunk in self.execute_task(task_id, description, context):
            outputs.append(chunk)
        
        # 获取任务
        task = self.tasks.get(task_id)
        if not task:
            return TaskResult.error_result(
                error="任务未找到",
                error_type="TaskNotFoundError"
            )
        
        # 构建结果
        if task.status == "completed":
            return TaskResult.success_result(
                data={
                    "task_id": task.task_id,
                    "description": task.description,
                    "final_result": task.final_result,
                    "steps": [step.to_dict() for step in task.steps],
                    "total_execution_time": task.total_execution_time,
                },
                execution_time=task.total_execution_time,
                metadata={"output": "".join(outputs)}
            )
        else:
            return TaskResult.error_result(
                error=task.final_result,
                error_type="AgentExecutionError",
                execution_time=task.total_execution_time,
                metadata={"output": "".join(outputs)}
            )
    
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
    
    def get_task_result(self, task_id: str) -> Optional[TaskResult]:
        """获取任务执行结果（统一格式）"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        if task.status == "completed":
            return TaskResult.success_result(
                data={
                    "task_id": task.task_id,
                    "description": task.description,
                    "final_result": task.final_result,
                    "steps": [step.to_dict() for step in task.steps],
                },
                execution_time=task.total_execution_time
            )
        elif task.status == "failed":
            return TaskResult.error_result(
                error=task.final_result,
                error_type="AgentExecutionError",
                execution_time=task.total_execution_time
            )
        else:
            return TaskResult(
                success=False,
                error="任务尚未完成",
                status=TaskStatus.PENDING
            )
    
    def list_tasks(self, status: Optional[str] = None) -> List[Dict]:
        """列出所有任务"""
        tasks = []
        for task in self.tasks.values():
            if status is None or task.status == status:
                tasks.append(task.to_dict())
        return tasks
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """清理旧任务"""
        from datetime import timedelta
        
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        to_remove = []
        
        for task_id, task in self.tasks.items():
            if task.created_at < cutoff_time:
                to_remove.append(task_id)
        
        for task_id in to_remove:
            del self.tasks[task_id]
        
        return len(to_remove)
    
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
