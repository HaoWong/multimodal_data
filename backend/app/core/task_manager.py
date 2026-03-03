"""
任务管理器 - 跟踪和管理所有后台任务
"""
import asyncio
import time
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import threading


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"      # 等待中
    RUNNING = "running"      # 运行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"        # 失败
    CANCELLED = "cancelled"  # 已取消


@dataclass
class TaskInfo:
    """任务信息"""
    task_id: str
    task_type: str         # 任务类型：video_process, image_analyze, document_upload 等
    status: TaskStatus
    progress: float = 0.0  # 进度 0-100
    message: str = ""      # 当前状态消息
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)  # 额外信息：文件名、文件大小等


class TaskManager:
    """任务管理器 - 单例模式"""
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._tasks: Dict[str, TaskInfo] = {}
        self._callbacks: Dict[str, List[Callable]] = {}
        self._lock = asyncio.Lock()

    async def create_task(self, task_id: str, task_type: str, metadata: dict = None) -> TaskInfo:
        """创建新任务"""
        async with self._lock:
            task = TaskInfo(
                task_id=task_id,
                task_type=task_type,
                status=TaskStatus.PENDING,
                metadata=metadata or {}
            )
            self._tasks[task_id] = task
            print(f"[TaskManager] 创建任务: {task_id}, 类型: {task_type}")
            return task

    async def start_task(self, task_id: str):
        """标记任务开始运行"""
        async with self._lock:
            if task_id in self._tasks:
                task = self._tasks[task_id]
                task.status = TaskStatus.RUNNING
                task.started_at = time.time()
                print(f"[TaskManager] 任务开始: {task_id}")
                await self._notify_callbacks(task_id)

    async def update_progress(self, task_id: str, progress: float, message: str = ""):
        """更新任务进度"""
        async with self._lock:
            if task_id in self._tasks:
                task = self._tasks[task_id]
                task.progress = min(100.0, max(0.0, progress))
                if message:
                    task.message = message
                print(f"[TaskManager] 任务进度: {task_id}, {progress:.1f}%, {message}")
                await self._notify_callbacks(task_id)

    async def complete_task(self, task_id: str, result: dict = None):
        """标记任务完成"""
        async with self._lock:
            if task_id in self._tasks:
                task = self._tasks[task_id]
                task.status = TaskStatus.COMPLETED
                task.progress = 100.0
                task.completed_at = time.time()
                task.result = result
                print(f"[TaskManager] 任务完成: {task_id}")
                await self._notify_callbacks(task_id)

    async def fail_task(self, task_id: str, error: str):
        """标记任务失败"""
        async with self._lock:
            if task_id in self._tasks:
                task = self._tasks[task_id]
                task.status = TaskStatus.FAILED
                task.completed_at = time.time()
                task.error = error
                print(f"[TaskManager] 任务失败: {task_id}, 错误: {error}")
                await self._notify_callbacks(task_id)

    async def cancel_task(self, task_id: str):
        """取消任务"""
        async with self._lock:
            if task_id in self._tasks:
                task = self._tasks[task_id]
                task.status = TaskStatus.CANCELLED
                task.completed_at = time.time()
                print(f"[TaskManager] 任务取消: {task_id}")
                await self._notify_callbacks(task_id)

    def get_task(self, task_id: str) -> Optional[TaskInfo]:
        """获取任务信息"""
        return self._tasks.get(task_id)

    def get_all_tasks(self, status: TaskStatus = None, db_session=None) -> List[TaskInfo]:
        """获取所有任务，可按状态过滤"""
        # 先从内存获取运行中的任务
        tasks = list(self._tasks.values())
        
        # 如果需要，从数据库获取已完成的任务
        if not status or status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            try:
                from app.models.content_models import Content
                from app.core.database import SessionLocal
                
                if db_session is None:
                    db = SessionLocal()
                else:
                    db = db_session
                
                # 获取最近的内容记录作为已完成的任务
                recent_contents = db.query(Content).order_by(
                    Content.created_at.desc()
                ).limit(50).all()
                
                for content in recent_contents:
                    task_id = str(content.id)
                    # 如果内存中已有，跳过
                    if task_id in self._tasks:
                        continue
                    
                    # 从内容创建任务信息
                    task_status = TaskStatus.COMPLETED if content.description else TaskStatus.FAILED
                    task = TaskInfo(
                        task_id=task_id,
                        task_type=self._get_task_type(content.content_type),
                        status=task_status,
                        progress=100.0,
                        message="处理完成" if content.description else "处理失败",
                        created_at=content.created_at.timestamp() if content.created_at else time.time(),
                        completed_at=content.updated_at.timestamp() if content.updated_at else time.time(),
                        metadata={
                            "filename": content.original_name,
                            "content_type": content.content_type.value if hasattr(content.content_type, 'value') else str(content.content_type)
                        }
                    )
                    tasks.append(task)
                
                if db_session is None:
                    db.close()
                    
            except Exception as e:
                print(f"[TaskManager] 从数据库加载任务失败: {e}")
        
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        # 按创建时间倒序
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks
    
    def _get_task_type(self, content_type) -> str:
        """根据内容类型获取任务类型"""
        type_str = content_type.value if hasattr(content_type, 'value') else str(content_type)
        type_map = {
            "VIDEO": "video_process",
            "IMAGE": "image_analyze",
            "TEXT": "document_upload"
        }
        return type_map.get(type_str, "document_upload")

    def get_running_tasks(self) -> List[TaskInfo]:
        """获取正在运行的任务"""
        return self.get_all_tasks(TaskStatus.RUNNING)

    def get_recent_tasks(self, limit: int = 20) -> List[TaskInfo]:
        """获取最近的任务"""
        tasks = self.get_all_tasks()
        return tasks[:limit]

    async def cleanup_old_tasks(self, max_age_hours: int = 24):
        """清理旧任务"""
        async with self._lock:
            current_time = time.time()
            to_remove = []
            for task_id, task in self._tasks.items():
                if task.completed_at and (current_time - task.completed_at) > (max_age_hours * 3600):
                    to_remove.append(task_id)
            for task_id in to_remove:
                del self._tasks[task_id]
                print(f"[TaskManager] 清理旧任务: {task_id}")

    def register_callback(self, task_id: str, callback: Callable):
        """注册任务状态变更回调"""
        if task_id not in self._callbacks:
            self._callbacks[task_id] = []
        self._callbacks[task_id].append(callback)

    async def _notify_callbacks(self, task_id: str):
        """通知所有回调"""
        if task_id in self._callbacks:
            task = self._tasks.get(task_id)
            if task:
                for callback in self._callbacks[task_id]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(task)
                        else:
                            callback(task)
                    except Exception as e:
                        print(f"[TaskManager] 回调执行失败: {e}")

    def to_dict(self, task: TaskInfo) -> dict:
        """将任务转换为字典"""
        return {
            "task_id": task.task_id,
            "task_type": task.task_type,
            "status": task.status.value,
            "progress": round(task.progress, 1),
            "message": task.message,
            "created_at": datetime.fromtimestamp(task.created_at).isoformat(),
            "started_at": datetime.fromtimestamp(task.started_at).isoformat() if task.started_at else None,
            "completed_at": datetime.fromtimestamp(task.completed_at).isoformat() if task.completed_at else None,
            "duration": round(task.completed_at - task.started_at, 2) if task.completed_at and task.started_at else None,
            "result": task.result,
            "error": task.error,
            "metadata": task.metadata
        }


# 全局任务管理器实例
task_manager = TaskManager()
