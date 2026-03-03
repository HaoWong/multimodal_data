"""
Agent执行API
使用新的纯调度器架构
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Any, Dict
import uuid
import json

from app.agent import agent

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/execute")
async def execute_task(request: Dict[str, Any]):
    """执行Agent任务（非流式）"""
    task = request.get("task")
    context = request.get("context", {})
    
    if not task:
        raise HTTPException(status_code=400, detail="task is required")
    
    task_id = str(uuid.uuid4())
    
    # 收集所有输出
    outputs = []
    async for chunk in agent.execute_task(task_id, task, context):
        outputs.append(chunk)
    
    # 获取最终任务状态
    agent_task = agent.get_task(task_id)
    
    return {
        "task_id": task_id,
        "status": agent_task.status if agent_task else "unknown",
        "output": "".join(outputs),
        "final_result": agent_task.final_result if agent_task else ""
    }


@router.post("/execute/stream")
async def execute_task_stream(request: Dict[str, Any]):
    """执行Agent任务（流式）"""
    task = request.get("task")
    context = request.get("context", {})
    
    if not task:
        raise HTTPException(status_code=400, detail="task is required")
    
    task_id = str(uuid.uuid4())
    
    async def generate():
        async for chunk in agent.execute_task(task_id, task, context):
            yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


@router.get("/task/{task_id}")
def get_task_status(task_id: str):
    """获取任务状态"""
    task = agent.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return {
        "task_id": task.task_id,
        "description": task.description,
        "status": task.status,
        "final_result": task.final_result,
        "steps": [
            {
                "step_number": s.step_number,
                "skill_name": s.skill_name,
                "reasoning": s.reasoning,
                "success": s.result.success if s.result else None,
                "error": s.result.error if s.result else None
            }
            for s in task.steps
        ]
    }


@router.get("/skills")
def list_skills():
    """列出所有可用的 Skills"""
    from app.skills import skill_registry
    return {
        "skills": skill_registry.list_skills()
    }
