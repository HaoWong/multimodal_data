"""
任务监控 API
提供任务状态查询和管理功能
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.task_manager import task_manager, TaskStatus
from app.core.database import get_db

router = APIRouter(prefix="/tasks", tags=["任务管理"])


@router.get("/")
def list_tasks(
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    获取任务列表
    
    参数:
    - status: 按状态过滤 (pending, running, completed, failed, cancelled)
    - limit: 返回数量限制
    """
    if status:
        try:
            task_status = TaskStatus(status)
            tasks = task_manager.get_all_tasks(task_status, db)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"无效的状态: {status}")
    else:
        tasks = task_manager.get_all_tasks(db_session=db)[:limit]
    
    return {
        "tasks": [task_manager.to_dict(task) for task in tasks],
        "total": len(tasks)
    }


@router.get("/running")
def get_running_tasks():
    """获取正在运行的任务"""
    tasks = task_manager.get_running_tasks()
    return {
        "tasks": [task_manager.to_dict(task) for task in tasks],
        "total": len(tasks)
    }


@router.get("/{task_id}")
def get_task_detail(task_id: str):
    """获取任务详情"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return task_manager.to_dict(task)


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str):
    """取消任务"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status not in [TaskStatus.PENDING, TaskStatus.RUNNING]:
        raise HTTPException(status_code=400, detail=f"任务状态为 {task.status.value}，无法取消")
    
    await task_manager.cancel_task(task_id)
    return {"message": "任务已取消"}


@router.delete("/cleanup")
async def cleanup_tasks(max_age_hours: int = 24):
    """清理旧任务"""
    await task_manager.cleanup_old_tasks(max_age_hours)
    return {"message": f"已清理 {max_age_hours} 小时前的任务"}
