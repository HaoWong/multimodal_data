"""
全局错误处理中间件

提供统一的异常处理和响应格式化。
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from pydantic import ValidationError
import traceback
from typing import Callable, Any
import time

from app.core.response import APIResponse, ErrorCode, CustomJSONResponse, APIException


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    全局错误处理中间件
    
    捕获所有未处理的异常，并返回标准化的错误响应。
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Any:
        """
        处理请求并捕获异常
        
        Args:
            request: 请求对象
            call_next: 下一个中间件或路由处理函数
            
        Returns:
            响应对象
        """
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # 捕获所有未处理的异常
            return await self._handle_exception(request, exc)
    
    async def _handle_exception(self, request: Request, exc: Exception) -> JSONResponse:
        """
        处理异常并返回标准化响应
        
        Args:
            request: 请求对象
            exc: 异常对象
            
        Returns:
            JSONResponse
        """
        # 根据异常类型选择处理方式
        if isinstance(exc, APIException):
            return self._handle_api_exception(exc)
        elif isinstance(exc, RequestValidationError):
            return self._handle_validation_error(exc)
        elif isinstance(exc, ValidationError):
            return self._handle_pydantic_error(exc)
        elif isinstance(exc, IntegrityError):
            return self._handle_integrity_error(exc)
        elif isinstance(exc, OperationalError):
            return self._handle_operational_error(exc)
        elif isinstance(exc, SQLAlchemyError):
            return self._handle_database_error(exc)
        elif isinstance(exc, HTTPException):
            return self._handle_http_exception(exc)
        else:
            return self._handle_unknown_error(exc)
    
    def _handle_api_exception(self, exc: APIException) -> JSONResponse:
        """处理API异常"""
        return CustomJSONResponse(
            status_code=exc.status_code,
            content=exc.detail
        )
    
    def _handle_validation_error(self, exc: RequestValidationError) -> JSONResponse:
        """处理请求验证错误 (FastAPI)"""
        errors = []
        for error in exc.errors():
            error_info = {
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            }
            errors.append(error_info)
        
        response = APIResponse.error(
            error="请求参数验证失败",
            code=ErrorCode.VALIDATION_ERROR,
            details={"errors": errors}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response
        )
    
    def _handle_pydantic_error(self, exc: ValidationError) -> JSONResponse:
        """处理Pydantic验证错误"""
        errors = []
        for error in exc.errors():
            error_info = {
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            }
            errors.append(error_info)
        
        response = APIResponse.error(
            error="数据验证失败",
            code=ErrorCode.VALIDATION_ERROR,
            details={"errors": errors}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response
        )
    
    def _handle_integrity_error(self, exc: IntegrityError) -> JSONResponse:
        """处理数据库完整性错误"""
        error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        
        # 判断具体错误类型
        if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
            response = APIResponse.error(
                error="数据已存在",
                code=ErrorCode.RESOURCE_ALREADY_EXISTS,
                details={"original_error": error_msg}
            )
            status_code = status.HTTP_409_CONFLICT
        elif "foreign" in error_msg.lower():
            response = APIResponse.error(
                error="外键约束冲突",
                code=ErrorCode.DATABASE_CONSTRAINT_ERROR,
                details={"original_error": error_msg}
            )
            status_code = status.HTTP_400_BAD_REQUEST
        else:
            response = APIResponse.error(
                error="数据库约束错误",
                code=ErrorCode.DATABASE_CONSTRAINT_ERROR,
                details={"original_error": error_msg}
            )
            status_code = status.HTTP_400_BAD_REQUEST
        
        return CustomJSONResponse(
            status_code=status_code,
            content=response
        )
    
    def _handle_operational_error(self, exc: OperationalError) -> JSONResponse:
        """处理数据库操作错误 (连接问题等)"""
        error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        
        response = APIResponse.error(
            error="数据库连接失败",
            code=ErrorCode.DATABASE_CONNECTION_ERROR,
            details={"original_error": error_msg}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response
        )
    
    def _handle_database_error(self, exc: SQLAlchemyError) -> JSONResponse:
        """处理通用数据库错误"""
        error_msg = str(exc)
        
        response = APIResponse.error(
            error="数据库操作失败",
            code=ErrorCode.DATABASE_ERROR,
            details={"original_error": error_msg}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response
        )
    
    def _handle_http_exception(self, exc: HTTPException) -> JSONResponse:
        """处理HTTP异常"""
        # 如果detail已经是字典格式，直接使用
        if isinstance(exc.detail, dict):
            content = exc.detail
        else:
            # 将HTTPException转换为标准格式
            content = APIResponse.error(
                error=str(exc.detail),
                code=ErrorCode.UNKNOWN_ERROR
            )
        
        return CustomJSONResponse(
            status_code=exc.status_code,
            content=content
        )
    
    def _handle_unknown_error(self, exc: Exception) -> JSONResponse:
        """处理未知错误"""
        # 记录详细的错误信息
        error_traceback = traceback.format_exc()
        print(f"\n{'='*60}")
        print(f"❌ 未捕获的异常: {type(exc).__name__}")
        print(f"错误信息: {str(exc)}")
        print(f"堆栈跟踪:\n{error_traceback}")
        print(f"{'='*60}\n")
        
        response = APIResponse.error(
            error="服务器内部错误",
            code=ErrorCode.UNKNOWN_ERROR,
            details={
                "error_type": type(exc).__name__,
                "error_message": str(exc)
            }
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response
        )


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件
    
    记录请求和响应信息。
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Any:
        start_time = time.time()
        
        # 记录请求信息
        print(f"📥 {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # 记录响应信息
            print(f"📤 {request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)")
            
            # 添加响应头
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
        except Exception as exc:
            process_time = time.time() - start_time
            print(f"❌ {request.method} {request.url.path} - ERROR ({process_time:.3f}s): {exc}")
            raise


class CORSMiddlewareConfig:
    """
    CORS中间件配置
    
    提供跨域资源共享配置。
    """
    
    @staticmethod
    def get_config():
        from fastapi.middleware.cors import CORSMiddleware
        return {
            "middleware_class": CORSMiddleware,
            "allow_origins": ["*"],
            "allow_credentials": True,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
        }


# 异常处理器注册函数
def register_exception_handlers(app: Any) -> None:
    """
    注册全局异常处理器
    
    Args:
        app: FastAPI应用实例
    """
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """处理请求验证错误"""
        errors = []
        for error in exc.errors():
            error_info = {
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            }
            errors.append(error_info)
        
        response = APIResponse.error(
            error="请求参数验证失败",
            code=ErrorCode.VALIDATION_ERROR,
            details={"errors": errors}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response
        )
    
    @app.exception_handler(ValidationError)
    async def pydantic_validation_handler(request: Request, exc: ValidationError):
        """处理Pydantic验证错误"""
        errors = []
        for error in exc.errors():
            error_info = {
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            }
            errors.append(error_info)
        
        response = APIResponse.error(
            error="数据验证失败",
            code=ErrorCode.VALIDATION_ERROR,
            details={"errors": errors}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response
        )
    
    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        """处理数据库完整性错误"""
        error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        
        if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
            response = APIResponse.error(
                error="数据已存在",
                code=ErrorCode.RESOURCE_ALREADY_EXISTS,
                details={"original_error": error_msg}
            )
            status_code = status.HTTP_409_CONFLICT
        else:
            response = APIResponse.error(
                error="数据库约束错误",
                code=ErrorCode.DATABASE_CONSTRAINT_ERROR,
                details={"original_error": error_msg}
            )
            status_code = status.HTTP_400_BAD_REQUEST
        
        return CustomJSONResponse(
            status_code=status_code,
            content=response
        )
    
    @app.exception_handler(OperationalError)
    async def operational_error_handler(request: Request, exc: OperationalError):
        """处理数据库操作错误"""
        error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        
        response = APIResponse.error(
            error="数据库连接失败",
            code=ErrorCode.DATABASE_CONNECTION_ERROR,
            details={"original_error": error_msg}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response
        )
    
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        """处理通用数据库错误"""
        error_msg = str(exc)
        
        response = APIResponse.error(
            error="数据库操作失败",
            code=ErrorCode.DATABASE_ERROR,
            details={"original_error": error_msg}
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response
        )
    
    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        """处理API异常"""
        return CustomJSONResponse(
            status_code=exc.status_code,
            content=exc.detail
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """处理所有其他未捕获的异常"""
        error_traceback = traceback.format_exc()
        print(f"\n{'='*60}")
        print(f"❌ 未捕获的异常: {type(exc).__name__}")
        print(f"错误信息: {str(exc)}")
        print(f"堆栈跟踪:\n{error_traceback}")
        print(f"{'='*60}\n")
        
        response = APIResponse.error(
            error="服务器内部错误",
            code=ErrorCode.UNKNOWN_ERROR,
            details={
                "error_type": type(exc).__name__,
                "error_message": str(exc)
            }
        )
        
        return CustomJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response
        )


# 便捷导出
__all__ = [
    "ErrorHandlerMiddleware",
    "LoggingMiddleware",
    "CORSMiddlewareConfig",
    "register_exception_handlers"
]
