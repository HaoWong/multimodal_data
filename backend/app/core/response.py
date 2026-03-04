"""
统一API响应格式模块

提供标准化的API响应格式，包括成功响应和错误响应。
"""
from enum import Enum
from typing import Any, Optional, Dict, List, Union
from fastapi.responses import JSONResponse
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field
import json


class ErrorCode(str, Enum):
    """错误码枚举"""
    # 通用错误 (1000-1099)
    UNKNOWN_ERROR = "1000"
    INVALID_PARAMETER = "1001"
    MISSING_PARAMETER = "1002"
    INVALID_FORMAT = "1003"
    OPERATION_FAILED = "1004"
    
    # 认证授权错误 (2000-2099)
    UNAUTHORIZED = "2000"
    FORBIDDEN = "2001"
    TOKEN_EXPIRED = "2002"
    INVALID_TOKEN = "2003"
    
    # 资源错误 (3000-3099)
    RESOURCE_NOT_FOUND = "3000"
    RESOURCE_ALREADY_EXISTS = "3001"
    RESOURCE_CONFLICT = "3002"
    RESOURCE_LIMIT_EXCEEDED = "3003"
    
    # 数据库错误 (4000-4099)
    DATABASE_ERROR = "4000"
    DATABASE_CONNECTION_ERROR = "4001"
    DATABASE_QUERY_ERROR = "4002"
    DATABASE_CONSTRAINT_ERROR = "4003"
    
    # 业务逻辑错误 (5000-5099)
    BUSINESS_LOGIC_ERROR = "5000"
    VALIDATION_ERROR = "5001"
    OPERATION_NOT_ALLOWED = "5002"
    INSUFFICIENT_RESOURCES = "5003"
    
    # 外部服务错误 (6000-6099)
    EXTERNAL_SERVICE_ERROR = "6000"
    OLLAMA_SERVICE_ERROR = "6001"
    FILE_SERVICE_ERROR = "6002"
    VECTOR_SERVICE_ERROR = "6003"
    
    # 任务执行错误 (7000-7099)
    TASK_ERROR = "7000"
    TASK_TIMEOUT = "7001"
    TASK_CANCELLED = "7002"
    TASK_EXECUTION_ERROR = "7003"


# 错误码对应的HTTP状态码和默认消息
ERROR_CODE_MAPPING: Dict[ErrorCode, Dict[str, Any]] = {
    # 通用错误
    ErrorCode.UNKNOWN_ERROR: {"status_code": 500, "message": "未知错误"},
    ErrorCode.INVALID_PARAMETER: {"status_code": 400, "message": "参数无效"},
    ErrorCode.MISSING_PARAMETER: {"status_code": 400, "message": "缺少必要参数"},
    ErrorCode.INVALID_FORMAT: {"status_code": 400, "message": "格式错误"},
    ErrorCode.OPERATION_FAILED: {"status_code": 500, "message": "操作失败"},
    
    # 认证授权错误
    ErrorCode.UNAUTHORIZED: {"status_code": 401, "message": "未授权访问"},
    ErrorCode.FORBIDDEN: {"status_code": 403, "message": "禁止访问"},
    ErrorCode.TOKEN_EXPIRED: {"status_code": 401, "message": "令牌已过期"},
    ErrorCode.INVALID_TOKEN: {"status_code": 401, "message": "无效的令牌"},
    
    # 资源错误
    ErrorCode.RESOURCE_NOT_FOUND: {"status_code": 404, "message": "资源不存在"},
    ErrorCode.RESOURCE_ALREADY_EXISTS: {"status_code": 409, "message": "资源已存在"},
    ErrorCode.RESOURCE_CONFLICT: {"status_code": 409, "message": "资源冲突"},
    ErrorCode.RESOURCE_LIMIT_EXCEEDED: {"status_code": 429, "message": "超出资源限制"},
    
    # 数据库错误
    ErrorCode.DATABASE_ERROR: {"status_code": 500, "message": "数据库错误"},
    ErrorCode.DATABASE_CONNECTION_ERROR: {"status_code": 500, "message": "数据库连接失败"},
    ErrorCode.DATABASE_QUERY_ERROR: {"status_code": 500, "message": "数据库查询错误"},
    ErrorCode.DATABASE_CONSTRAINT_ERROR: {"status_code": 400, "message": "数据约束冲突"},
    
    # 业务逻辑错误
    ErrorCode.BUSINESS_LOGIC_ERROR: {"status_code": 422, "message": "业务逻辑错误"},
    ErrorCode.VALIDATION_ERROR: {"status_code": 422, "message": "数据验证失败"},
    ErrorCode.OPERATION_NOT_ALLOWED: {"status_code": 403, "message": "操作不允许"},
    ErrorCode.INSUFFICIENT_RESOURCES: {"status_code": 503, "message": "资源不足"},
    
    # 外部服务错误
    ErrorCode.EXTERNAL_SERVICE_ERROR: {"status_code": 502, "message": "外部服务错误"},
    ErrorCode.OLLAMA_SERVICE_ERROR: {"status_code": 502, "message": "Ollama服务错误"},
    ErrorCode.FILE_SERVICE_ERROR: {"status_code": 502, "message": "文件服务错误"},
    ErrorCode.VECTOR_SERVICE_ERROR: {"status_code": 502, "message": "向量服务错误"},
    
    # 任务执行错误
    ErrorCode.TASK_ERROR: {"status_code": 500, "message": "任务执行错误"},
    ErrorCode.TASK_TIMEOUT: {"status_code": 504, "message": "任务执行超时"},
    ErrorCode.TASK_CANCELLED: {"status_code": 499, "message": "任务已取消"},
    ErrorCode.TASK_EXECUTION_ERROR: {"status_code": 500, "message": "任务执行失败"},
}


class PaginationData(BaseModel):
    """分页数据结构"""
    page: int = Field(default=1, description="当前页码")
    page_size: int = Field(default=10, description="每页大小")
    total: int = Field(default=0, description="总记录数")
    total_pages: int = Field(default=0, description="总页数")
    has_next: bool = Field(default=False, description="是否有下一页")
    has_prev: bool = Field(default=False, description="是否有上一页")


class BaseResponse(BaseModel):
    """基础响应模型"""
    success: bool = Field(..., description="是否成功")
    message: Optional[str] = Field(default=None, description="响应消息")
    timestamp: str = Field(default_factory=lambda: __import__('datetime').datetime.now().isoformat(), description="响应时间戳")


class SuccessResponse(BaseResponse):
    """成功响应模型"""
    success: bool = True
    data: Optional[Any] = Field(default=None, description="响应数据")
    pagination: Optional[PaginationData] = Field(default=None, description="分页信息")


class ErrorResponse(BaseResponse):
    """错误响应模型"""
    success: bool = False
    error: str = Field(..., description="错误信息")
    code: str = Field(..., description="错误码")
    details: Optional[Dict[str, Any]] = Field(default=None, description="错误详情")


class CustomJSONResponse(JSONResponse):
    """自定义 JSONResponse，确保中文字符不被转义"""
    def render(self, content) -> bytes:
        return json.dumps(content, ensure_ascii=False, allow_nan=False, indent=None, separators=(",", ":")).encode("utf-8")


class APIResponse:
    """
    统一API响应类
    
    提供标准化的成功和错误响应方法。
    """
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = "操作成功",
        pagination: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        创建成功响应
        
        Args:
            data: 响应数据
            message: 成功消息
            pagination: 分页信息 (可选)
            
        Returns:
            标准化的成功响应字典
            
        示例:
            >>> APIResponse.success(data={"id": 1}, message="创建成功")
            {
                "success": True,
                "data": {"id": 1},
                "message": "创建成功",
                "timestamp": "2024-01-01T12:00:00"
            }
        """
        response = {
            "success": True,
            "data": data,
            "message": message,
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
        
        if pagination:
            response["pagination"] = pagination
            
        return response
    
    @staticmethod
    def error(
        error: str = "操作失败",
        code: Union[ErrorCode, str] = ErrorCode.UNKNOWN_ERROR,
        details: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        创建错误响应
        
        Args:
            error: 错误信息
            code: 错误码 (ErrorCode枚举或字符串)
            details: 错误详情 (可选)
            status_code: HTTP状态码 (可选，默认根据错误码映射)
            
        Returns:
            标准化的错误响应字典
            
        示例:
            >>> APIResponse.error(error="用户不存在", code=ErrorCode.RESOURCE_NOT_FOUND)
            {
                "success": False,
                "error": "用户不存在",
                "code": "3000",
                "message": "资源不存在",
                "timestamp": "2024-01-01T12:00:00"
            }
        """
        # 将字符串错误码转换为枚举
        if isinstance(code, str) and not isinstance(code, ErrorCode):
            try:
                code = ErrorCode(code)
            except ValueError:
                code = ErrorCode.UNKNOWN_ERROR
        
        # 获取错误码映射信息
        mapping = ERROR_CODE_MAPPING.get(code, ERROR_CODE_MAPPING[ErrorCode.UNKNOWN_ERROR])
        
        response = {
            "success": False,
            "error": error,
            "code": code.value if isinstance(code, ErrorCode) else code,
            "message": mapping["message"],
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
        
        if details:
            response["details"] = details
            
        return response
    
    @staticmethod
    def paginated(
        data: List[Any],
        total: int,
        page: int = 1,
        page_size: int = 10,
        message: str = "查询成功"
    ) -> Dict[str, Any]:
        """
        创建分页响应
        
        Args:
            data: 数据列表
            total: 总记录数
            page: 当前页码
            page_size: 每页大小
            message: 成功消息
            
        Returns:
            包含分页信息的标准化响应
            
        示例:
            >>> APIResponse.paginated(data=[{"id": 1}], total=100, page=1, page_size=10)
            {
                "success": True,
                "data": [{"id": 1}],
                "message": "查询成功",
                "pagination": {
                    "page": 1,
                    "page_size": 10,
                    "total": 100,
                    "total_pages": 10,
                    "has_next": True,
                    "has_prev": False
                },
                "timestamp": "2024-01-01T12:00:00"
            }
        """
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        
        pagination = PaginationData(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
        
        return APIResponse.success(
            data=data,
            message=message,
            pagination=pagination.model_dump()
        )
    
    @staticmethod
    def created(data: Any = None, message: str = "创建成功") -> Dict[str, Any]:
        """创建资源成功响应"""
        return APIResponse.success(data=data, message=message)
    
    @staticmethod
    def updated(data: Any = None, message: str = "更新成功") -> Dict[str, Any]:
        """更新资源成功响应"""
        return APIResponse.success(data=data, message=message)
    
    @staticmethod
    def deleted(message: str = "删除成功") -> Dict[str, Any]:
        """删除资源成功响应"""
        return APIResponse.success(message=message)
    
    @staticmethod
    def not_found(resource: str = "资源") -> Dict[str, Any]:
        """资源不存在错误响应"""
        return APIResponse.error(
            error=f"{resource}不存在",
            code=ErrorCode.RESOURCE_NOT_FOUND
        )
    
    @staticmethod
    def validation_error(error: str = "数据验证失败", details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """验证错误响应"""
        return APIResponse.error(
            error=error,
            code=ErrorCode.VALIDATION_ERROR,
            details=details
        )
    
    @staticmethod
    def database_error(error: str = "数据库操作失败") -> Dict[str, Any]:
        """数据库错误响应"""
        return APIResponse.error(
            error=error,
            code=ErrorCode.DATABASE_ERROR
        )


class APIException(HTTPException):
    """
    API异常类
    
    用于在业务逻辑中抛出标准化的API错误
    """
    
    def __init__(
        self,
        error: str = "操作失败",
        code: Union[ErrorCode, str] = ErrorCode.UNKNOWN_ERROR,
        details: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None
    ):
        # 将字符串错误码转换为枚举
        if isinstance(code, str) and not isinstance(code, ErrorCode):
            try:
                code = ErrorCode(code)
            except ValueError:
                code = ErrorCode.UNKNOWN_ERROR
        
        # 获取错误码映射信息
        mapping = ERROR_CODE_MAPPING.get(code, ERROR_CODE_MAPPING[ErrorCode.UNKNOWN_ERROR])
        
        self.error_code = code
        self.error_details = details
        
        super().__init__(
            status_code=status_code or mapping["status_code"],
            detail={
                "success": False,
                "error": error,
                "code": code.value if isinstance(code, ErrorCode) else code,
                "message": mapping["message"],
                "details": details,
                "timestamp": __import__('datetime').datetime.now().isoformat()
            }
        )


# 便捷导出
__all__ = [
    "ErrorCode",
    "ERROR_CODE_MAPPING",
    "PaginationData",
    "BaseResponse",
    "SuccessResponse",
    "ErrorResponse",
    "CustomJSONResponse",
    "APIResponse",
    "APIException"
]
