"""
统一任务执行引擎
提供统一的任务执行、参数验证、结果处理、重试机制和超时控制
"""
import asyncio
import functools
import time
import traceback
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union, AsyncGenerator


class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    TIMEOUT = "timeout"


@dataclass
class TaskResult:
    """
    统一任务执行结果数据类
    
    用于 Skill 和 Agent 的统一结果返回格式
    """
    success: bool
    data: Any = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    execution_time: float = 0.0
    retry_count: int = 0
    status: TaskStatus = field(default_factory=lambda: TaskStatus.COMPLETED)
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    traceback_info: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "error_type": self.error_type,
            "execution_time": self.execution_time,
            "retry_count": self.retry_count,
            "status": self.status.value if isinstance(self.status, TaskStatus) else self.status,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
    
    @classmethod
    def success_result(
        cls,
        data: Any = None,
        execution_time: float = 0.0,
        metadata: Optional[Dict] = None
    ) -> "TaskResult":
        """创建成功结果"""
        return cls(
            success=True,
            data=data,
            execution_time=execution_time,
            status=TaskStatus.COMPLETED,
            metadata=metadata or {}
        )
    
    @classmethod
    def error_result(
        cls,
        error: str,
        error_type: Optional[str] = None,
        execution_time: float = 0.0,
        retry_count: int = 0,
        exception: Optional[Exception] = None
    ) -> "TaskResult":
        """创建错误结果"""
        traceback_info = None
        if exception:
            traceback_info = traceback.format_exc()
            error_type = error_type or type(exception).__name__
        
        return cls(
            success=False,
            error=error,
            error_type=error_type or "UnknownError",
            execution_time=execution_time,
            retry_count=retry_count,
            status=TaskStatus.FAILED,
            traceback_info=traceback_info
        )
    
    @classmethod
    def timeout_result(cls, timeout_seconds: float) -> "TaskResult":
        """创建超时结果"""
        return cls(
            success=False,
            error=f"任务执行超时 (>{timeout_seconds}s)",
            error_type="TimeoutError",
            execution_time=timeout_seconds,
            status=TaskStatus.TIMEOUT
        )


@dataclass
class TaskContext:
    """
    任务执行上下文
    
    用于在执行过程中传递上下文信息
    """
    task_id: Optional[str] = None
    task_name: Optional[str] = None
    task_type: Optional[str] = None  # 'skill' 或 'agent'
    parent_task_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    
    # 执行上下文
    params: Dict[str, Any] = field(default_factory=dict)
    execution_history: List[Dict] = field(default_factory=list)
    shared_data: Dict[str, Any] = field(default_factory=dict)
    
    # 配置选项
    options: Dict[str, Any] = field(default_factory=dict)
    
    # 时间戳
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def add_execution_record(self, record: Dict):
        """添加执行记录"""
        record["timestamp"] = datetime.now().isoformat()
        self.execution_history.append(record)
    
    def get_shared(self, key: str, default: Any = None) -> Any:
        """获取共享数据"""
        return self.shared_data.get(key, default)
    
    def set_shared(self, key: str, value: Any):
        """设置共享数据"""
        self.shared_data[key] = value
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "task_type": self.task_type,
            "parent_task_id": self.parent_task_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "params": self.params,
            "execution_history": self.execution_history,
            "shared_data": self.shared_data,
            "options": self.options,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


@dataclass
class ExecutionConfig:
    """
    执行配置
    
    控制任务执行的行为
    """
    # 超时设置（秒），None表示不超时
    timeout: Optional[float] = None
    
    # 重试配置
    max_retries: int = 0
    retry_delay: float = 1.0  # 重试间隔（秒）
    retry_backoff: float = 2.0  # 指数退避倍数
    retry_exceptions: tuple = (Exception,)  # 需要重试的异常类型
    
    # 执行选项
    validate_params: bool = True
    log_execution: bool = True
    collect_metrics: bool = True
    
    def should_retry(self, attempt: int, exception: Exception) -> bool:
        """判断是否应该重试"""
        if attempt >= self.max_retries:
            return False
        return isinstance(exception, self.retry_exceptions)
    
    def get_retry_delay(self, attempt: int) -> float:
        """获取重试延迟时间"""
        return self.retry_delay * (self.retry_backoff ** attempt)


# 类型变量
T = TypeVar('T')
TaskCallable = Callable[..., Any]
AsyncTaskCallable = Callable[..., Any]


class TaskExecutionEngine:
    """
    统一任务执行引擎
    
    提供统一的任务执行流程，包括：
    - 参数验证
    - 同步/异步执行支持
    - 超时控制
    - 自动重试
    - 执行日志
    - 结果处理
    """
    
    def __init__(self):
        self._validators: Dict[str, Callable] = {}
        self._pre_hooks: List[Callable] = []
        self._post_hooks: List[Callable] = []
        self._error_handlers: Dict[str, Callable] = {}
        self._execution_logs: List[Dict] = []
        self._max_log_entries: int = 1000
    
    def register_validator(self, task_type: str, validator: Callable):
        """注册参数验证器"""
        self._validators[task_type] = validator
    
    def register_pre_hook(self, hook: Callable):
        """注册前置钩子"""
        self._pre_hooks.append(hook)
    
    def register_post_hook(self, hook: Callable):
        """注册后置钩子"""
        self._post_hooks.append(hook)
    
    def register_error_handler(self, error_type: str, handler: Callable):
        """注册错误处理器"""
        self._error_handlers[error_type] = handler
    
    def _log_execution(
        self,
        context: TaskContext,
        status: TaskStatus,
        result: Optional[TaskResult] = None,
        error: Optional[str] = None
    ):
        """记录执行日志"""
        log_entry = {
            "task_id": context.task_id,
            "task_name": context.task_name,
            "task_type": context.task_type,
            "status": status.value,
            "timestamp": datetime.now().isoformat(),
            "execution_time": result.execution_time if result else 0,
            "error": error,
        }
        
        self._execution_logs.append(log_entry)
        
        # 限制日志数量
        if len(self._execution_logs) > self._max_log_entries:
            self._execution_logs = self._execution_logs[-self._max_log_entries:]
        
        # 控制台输出
        if status == TaskStatus.COMPLETED:
            print(f"✅ [{context.task_type}] {context.task_name} 执行成功 ({result.execution_time:.3f}s)")
        elif status == TaskStatus.FAILED:
            print(f"❌ [{context.task_type}] {context.task_name} 执行失败: {error}")
        elif status == TaskStatus.TIMEOUT:
            print(f"⏱️ [{context.task_type}] {context.task_name} 执行超时")
        elif status == TaskStatus.RETRYING:
            print(f"🔄 [{context.task_type}] {context.task_name} 正在重试...")
    
    def _validate_params(
        self,
        context: TaskContext,
        config: ExecutionConfig
    ) -> tuple[bool, Optional[str]]:
        """验证参数"""
        if not config.validate_params:
            return True, None
        
        # 获取验证器
        validator = self._validators.get(context.task_type or "default")
        if validator:
            return validator(context.params)
        
        return True, None
    
    async def _run_pre_hooks(self, context: TaskContext):
        """运行前置钩子"""
        for hook in self._pre_hooks:
            try:
                if asyncio.iscoroutinefunction(hook):
                    await hook(context)
                else:
                    hook(context)
            except Exception as e:
                print(f"⚠️ 前置钩子执行失败: {e}")
    
    async def _run_post_hooks(self, context: TaskContext, result: TaskResult):
        """运行后置钩子"""
        for hook in self._post_hooks:
            try:
                if asyncio.iscoroutinefunction(hook):
                    await hook(context, result)
                else:
                    hook(context, result)
            except Exception as e:
                print(f"⚠️ 后置钩子执行失败: {e}")
    
    async def _execute_with_timeout(
        self,
        func: Callable,
        timeout: Optional[float],
        *args,
        **kwargs
    ) -> Any:
        """带超时控制的执行"""
        if timeout is None:
            # 无超时限制
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                # 同步函数在线程池中执行
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, functools.partial(func, *args, **kwargs))
        
        # 有超时限制
        try:
            if asyncio.iscoroutinefunction(func):
                return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
            else:
                loop = asyncio.get_event_loop()
                return await asyncio.wait_for(
                    loop.run_in_executor(None, functools.partial(func, *args, **kwargs)),
                    timeout=timeout
                )
        except asyncio.TimeoutError:
            raise TimeoutError(f"任务执行超时 (>{timeout}s)")
    
    async def execute(
        self,
        func: Callable,
        context: TaskContext,
        config: Optional[ExecutionConfig] = None,
        *args,
        **kwargs
    ) -> TaskResult:
        """
        执行任务
        
        Args:
            func: 要执行的函数（同步或异步）
            context: 任务上下文
            config: 执行配置
            *args, **kwargs: 传递给函数的参数
        
        Returns:
            TaskResult: 统一格式的执行结果
        """
        config = config or ExecutionConfig()
        context.started_at = datetime.now()
        
        start_time = time.time()
        retry_count = 0
        
        # 参数验证
        if config.validate_params:
            valid, error = self._validate_params(context, config)
            if not valid:
                result = TaskResult.error_result(
                    error=error or "参数验证失败",
                    error_type="ValidationError",
                    execution_time=time.time() - start_time
                )
                self._log_execution(context, TaskStatus.FAILED, result, error)
                return result
        
        # 运行前置钩子
        await self._run_pre_hooks(context)
        
        # 执行主体（带重试）
        while True:
            try:
                # 执行函数
                result_data = await self._execute_with_timeout(
                    func,
                    config.timeout,
                    *args,
                    **kwargs
                )
                
                # 构建成功结果
                execution_time = time.time() - start_time
                
                # 如果函数返回 TaskResult，直接使用
                if isinstance(result_data, TaskResult):
                    result = result_data
                    result.execution_time = execution_time
                    result.retry_count = retry_count
                else:
                    result = TaskResult.success_result(
                        data=result_data,
                        execution_time=execution_time,
                        metadata={"retry_count": retry_count}
                    )
                    result.retry_count = retry_count
                
                context.completed_at = datetime.now()
                
                # 运行后置钩子
                await self._run_post_hooks(context, result)
                
                # 记录日志
                if config.log_execution:
                    self._log_execution(context, TaskStatus.COMPLETED, result)
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                
                # 检查是否需要重试
                if config.should_retry(retry_count, e):
                    retry_count += 1
                    delay = config.get_retry_delay(retry_count - 1)
                    
                    if config.log_execution:
                        self._log_execution(context, TaskStatus.RETRYING)
                    
                    print(f"🔄 第{retry_count}次重试，等待{delay:.1f}秒...")
                    await asyncio.sleep(delay)
                    continue
                
                # 构建错误结果
                result = TaskResult.error_result(
                    error=str(e),
                    execution_time=execution_time,
                    retry_count=retry_count,
                    exception=e
                )
                
                # 尝试错误处理
                error_handler = self._error_handlers.get(type(e).__name__)
                if error_handler:
                    try:
                        if asyncio.iscoroutinefunction(error_handler):
                            await error_handler(e, context)
                        else:
                            error_handler(e, context)
                    except Exception as handler_error:
                        print(f"⚠️ 错误处理器执行失败: {handler_error}")
                
                context.completed_at = datetime.now()
                
                # 运行后置钩子
                await self._run_post_hooks(context, result)
                
                # 记录日志
                if config.log_execution:
                    self._log_execution(context, TaskStatus.FAILED, result, str(e))
                
                return result
    
    async def execute_stream(
        self,
        func: Callable,
        context: TaskContext,
        config: Optional[ExecutionConfig] = None,
        *args,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        流式执行任务
        
        适用于需要流式返回结果的场景（如LLM生成）
        """
        config = config or ExecutionConfig()
        context.started_at = datetime.now()
        
        start_time = time.time()
        
        # 参数验证
        if config.validate_params:
            valid, error = self._validate_params(context, config)
            if not valid:
                yield f"❌ 参数验证失败: {error}\n"
                return
        
        # 运行前置钩子
        await self._run_pre_hooks(context)
        
        try:
            # 检查函数是否是异步生成器
            if hasattr(func, '__call__') and asyncio.iscoroutinefunction(func):
                # 调用函数获取生成器
                generator = await func(*args, **kwargs)
            else:
                generator = func(*args, **kwargs)
            
            # 流式输出
            async for chunk in generator:
                yield chunk
            
            context.completed_at = datetime.now()
            execution_time = time.time() - start_time
            
            if config.log_execution:
                print(f"✅ [{context.task_type}] {context.task_name} 流式执行完成 ({execution_time:.3f}s)")
                
        except Exception as e:
            context.completed_at = datetime.now()
            execution_time = time.time() - start_time
            
            yield f"\n❌ 执行失败: {str(e)}\n"
            
            if config.log_execution:
                print(f"❌ [{context.task_type}] {context.task_name} 流式执行失败: {e}")
    
    def get_execution_logs(
        self,
        task_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """获取执行日志"""
        logs = self._execution_logs
        
        if task_type:
            logs = [log for log in logs if log.get("task_type") == task_type]
        
        return logs[-limit:]
    
    def clear_logs(self):
        """清空日志"""
        self._execution_logs.clear()


# 全局执行引擎实例
task_engine = TaskExecutionEngine()


def create_task_context(
    task_name: str,
    task_type: str = "skill",
    params: Optional[Dict] = None,
    **kwargs
) -> TaskContext:
    """
    创建任务上下文的便捷函数
    """
    import uuid
    
    return TaskContext(
        task_id=kwargs.get("task_id") or str(uuid.uuid4()),
        task_name=task_name,
        task_type=task_type,
        params=params or {},
        parent_task_id=kwargs.get("parent_task_id"),
        user_id=kwargs.get("user_id"),
        session_id=kwargs.get("session_id"),
        options=kwargs.get("options", {}),
    )


def create_execution_config(
    timeout: Optional[float] = None,
    max_retries: int = 0,
    retry_delay: float = 1.0,
    **kwargs
) -> ExecutionConfig:
    """
    创建执行配置的便捷函数
    """
    return ExecutionConfig(
        timeout=timeout,
        max_retries=max_retries,
        retry_delay=retry_delay,
        retry_backoff=kwargs.get("retry_backoff", 2.0),
        retry_exceptions=kwargs.get("retry_exceptions", (Exception,)),
        validate_params=kwargs.get("validate_params", True),
        log_execution=kwargs.get("log_execution", True),
        collect_metrics=kwargs.get("collect_metrics", True),
    )
