"""
全局错误处理和重试机制
"""
import functools
import asyncio
from typing import Callable, Any, Optional
from datetime import datetime
import traceback


class RetryConfig:
    """重试配置"""
    def __init__(
        self,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        exponential_backoff: bool = True,
        max_delay: float = 60.0,
        retry_exceptions: tuple = (Exception,)
    ):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.exponential_backoff = exponential_backoff
        self.max_delay = max_delay
        self.retry_exceptions = retry_exceptions


class TaskTimeoutError(Exception):
    """任务超时错误"""
    pass


class SkillExecutionError(Exception):
    """Skill执行错误"""
    def __init__(self, skill_name: str, error: str, params: dict = None):
        self.skill_name = skill_name
        self.error = error
        self.params = params
        super().__init__(f"Skill '{skill_name}' execution failed: {error}")


def async_retry(config: Optional[RetryConfig] = None):
    """
    异步函数重试装饰器
    
    使用示例:
        @async_retry(RetryConfig(max_retries=3, retry_delay=2.0))
        async def my_async_function():
            # 可能失败的代码
            pass
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except config.retry_exceptions as e:
                    last_exception = e
                    
                    if attempt < config.max_retries:
                        # 计算延迟时间
                        if config.exponential_backoff:
                            delay = min(
                                config.retry_delay * (2 ** attempt),
                                config.max_delay
                            )
                        else:
                            delay = config.retry_delay
                        
                        print(f"⚠️ {func.__name__} 第 {attempt + 1} 次尝试失败: {e}")
                        print(f"⏳ {delay} 秒后重试...")
                        await asyncio.sleep(delay)
                    else:
                        print(f"❌ {func.__name__} 所有重试都失败了")
            
            # 所有重试都失败，抛出最后一个异常
            raise last_exception
        
        return wrapper
    return decorator


def sync_retry(config: Optional[RetryConfig] = None):
    """同步函数重试装饰器"""
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except config.retry_exceptions as e:
                    last_exception = e
                    
                    if attempt < config.max_retries:
                        if config.exponential_backoff:
                            delay = min(
                                config.retry_delay * (2 ** attempt),
                                config.max_delay
                            )
                        else:
                            delay = config.retry_delay
                        
                        print(f"⚠️ {func.__name__} 第 {attempt + 1} 次尝试失败: {e}")
                        print(f"⏳ {delay} 秒后重试...")
                        import time
                        time.sleep(delay)
                    else:
                        print(f"❌ {func.__name__} 所有重试都失败了")
            
            raise last_exception
        
        return wrapper
    return decorator


async def with_timeout(coro, timeout: float = 30.0, timeout_message: str = None):
    """
    为异步操作添加超时
    
    使用示例:
        result = await with_timeout(
            my_async_function(),
            timeout=10.0,
            timeout_message="操作超时"
        )
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        message = timeout_message or f"操作超时（{timeout}秒）"
        raise TaskTimeoutError(message)


class ErrorLogger:
    """错误日志记录器"""
    
    @staticmethod
    def log_error(error: Exception, context: dict = None):
        """记录错误信息"""
        error_info = {
            "timestamp": datetime.now().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
            "context": context or {}
        }
        
        print(f"\n{'='*60}")
        print(f"❌ 错误发生: {error_info['error_type']}")
        print(f"时间: {error_info['timestamp']}")
        print(f"消息: {error_info['error_message']}")
        if context:
            print(f"上下文: {context}")
        print(f"{'='*60}\n")
        
        return error_info
    
    @staticmethod
    def log_skill_error(skill_name: str, error: Exception, params: dict = None):
        """记录Skill执行错误"""
        context = {
            "skill_name": skill_name,
            "params": params
        }
        return ErrorLogger.log_error(error, context)
    
    @staticmethod
    def log_agent_error(task_id: str, error: Exception, task_description: str = None):
        """记录Agent执行错误"""
        context = {
            "task_id": task_id,
            "task_description": task_description
        }
        return ErrorLogger.log_error(error, context)


# 预定义的重试配置
RETRY_CONFIGS = {
    "default": RetryConfig(max_retries=3, retry_delay=1.0),
    "ollama": RetryConfig(
        max_retries=3,
        retry_delay=2.0,
        retry_exceptions=(ConnectionError, TimeoutError)
    ),
    "database": RetryConfig(
        max_retries=3,
        retry_delay=1.0,
        retry_exceptions=(Exception,)
    ),
    "file_io": RetryConfig(
        max_retries=2,
        retry_delay=0.5,
        retry_exceptions=(IOError, PermissionError)
    ),
}


def get_retry_config(name: str) -> RetryConfig:
    """获取预定义的重试配置"""
    return RETRY_CONFIGS.get(name, RETRY_CONFIGS["default"])
