"""
统一API响应格式使用示例

本文件展示了如何在项目中使用新的统一API响应格式。
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel

# 导入响应工具
from app.core.response import (
    APIResponse,           # 响应生成类
    ErrorCode,             # 错误码枚举
    APIException,          # API异常类
    CustomJSONResponse     # 自定义JSON响应
)


# ============ 示例数据模型 ============

class UserCreate(BaseModel):
    """创建用户请求模型"""
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    """用户响应模型"""
    id: int
    username: str
    email: str


class UserUpdate(BaseModel):
    """更新用户请求模型"""
    username: Optional[str] = None
    email: Optional[str] = None


# ============ 示例路由 ============

router = APIRouter(prefix="/examples", tags=["响应格式示例"])


# ============ 成功响应示例 ============

@router.get("/success/simple")
async def simple_success():
    """简单成功响应示例"""
    return APIResponse.success(message="操作成功")
    # 返回:
    # {
    #     "success": True,
    #     "data": null,
    #     "message": "操作成功",
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.get("/success/with-data")
async def success_with_data():
    """带数据的成功响应示例"""
    user_data = {
        "id": 1,
        "username": "张三",
        "email": "zhangsan@example.com"
    }
    return APIResponse.success(data=user_data, message="获取用户成功")
    # 返回:
    # {
    #     "success": True,
    #     "data": {
    #         "id": 1,
    #         "username": "张三",
    #         "email": "zhangsan@example.com"
    #     },
    #     "message": "获取用户成功",
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.get("/success/paginated")
async def paginated_response(page: int = 1, page_size: int = 10):
    """分页响应示例"""
    # 模拟数据查询
    all_users = [
        {"id": i, "username": f"用户{i}", "email": f"user{i}@example.com"}
        for i in range(1, 101)  # 100条数据
    ]
    
    # 分页逻辑
    total = len(all_users)
    start = (page - 1) * page_size
    end = start + page_size
    page_data = all_users[start:end]
    
    return APIResponse.paginated(
        data=page_data,
        total=total,
        page=page,
        page_size=page_size,
        message="获取用户列表成功"
    )
    # 返回:
    # {
    #     "success": True,
    #     "data": [...],
    #     "message": "获取用户列表成功",
    #     "pagination": {
    #         "page": 1,
    #         "page_size": 10,
    #         "total": 100,
    #         "total_pages": 10,
    #         "has_next": true,
    #         "has_prev": false
    #     },
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.post("/success/created")
async def created_response(user: UserCreate):
    """创建资源成功响应示例"""
    new_user = {
        "id": 1,
        "username": user.username,
        "email": user.email
    }
    return APIResponse.created(data=new_user, message="用户创建成功")


@router.put("/success/updated/{user_id}")
async def updated_response(user_id: int, user: UserUpdate):
    """更新资源成功响应示例"""
    updated_user = {
        "id": user_id,
        "username": user.username or "原用户名",
        "email": user.email or "原邮箱"
    }
    return APIResponse.updated(data=updated_user, message="用户更新成功")


@router.delete("/success/deleted/{user_id}")
async def deleted_response(user_id: int):
    """删除资源成功响应示例"""
    return APIResponse.deleted(message=f"用户 {user_id} 删除成功")


# ============ 错误响应示例 ============

@router.get("/error/simple")
async def simple_error():
    """简单错误响应示例"""
    return APIResponse.error(
        error="操作失败",
        code=ErrorCode.OPERATION_FAILED
    )
    # 返回:
    # {
    #     "success": False,
    #     "error": "操作失败",
    #     "code": "1004",
    #     "message": "操作失败",
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.get("/error/not-found")
async def not_found_error(user_id: int):
    """资源不存在错误示例"""
    # 模拟查询
    user = None  # 假设未找到
    
    if not user:
        return APIResponse.not_found(resource="用户")
    # 返回:
    # {
    #     "success": False,
    #     "error": "用户不存在",
    #     "code": "3000",
    #     "message": "资源不存在",
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.get("/error/validation")
async def validation_error():
    """验证错误示例"""
    return APIResponse.validation_error(
        error="输入数据验证失败",
        details={
            "errors": [
                {"field": "email", "message": "邮箱格式不正确"},
                {"field": "password", "message": "密码长度至少8位"}
            ]
        }
    )
    # 返回:
    # {
    #     "success": False,
    #     "error": "输入数据验证失败",
    #     "code": "5001",
    #     "message": "数据验证失败",
    #     "details": {
    #         "errors": [
    #             {"field": "email", "message": "邮箱格式不正确"},
    #             {"field": "password", "message": "密码长度至少8位"}
    #         ]
    #     },
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.get("/error/database")
async def database_error():
    """数据库错误示例"""
    return APIResponse.database_error(error="数据库查询失败")
    # 返回:
    # {
    #     "success": False,
    #     "error": "数据库查询失败",
    #     "code": "4000",
    #     "message": "数据库错误",
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.get("/error/custom")
async def custom_error():
    """自定义错误示例"""
    return APIResponse.error(
        error="自定义业务错误",
        code=ErrorCode.BUSINESS_LOGIC_ERROR,
        details={
            "business_code": "CUSTOM_001",
            "extra_info": "额外的错误信息"
        }
    )


# ============ 异常抛出示例 ============

@router.get("/exception/api-exception")
async def api_exception_example():
    """抛出API异常示例"""
    # 模拟业务逻辑检查
    resource_exists = False
    
    if not resource_exists:
        raise APIException(
            error="请求的资源不存在",
            code=ErrorCode.RESOURCE_NOT_FOUND,
            details={"resource_id": 123, "resource_type": "document"}
        )
    # 返回 HTTP 404:
    # {
    #     "success": False,
    #     "error": "请求的资源不存在",
    #     "code": "3000",
    #     "message": "资源不存在",
    #     "details": {
    #         "resource_id": 123,
    #         "resource_type": "document"
    #     },
    #     "timestamp": "2024-01-01T12:00:00"
    # }


@router.get("/exception/validation")
async def exception_validation(email: str):
    """验证异常示例"""
    if "@" not in email:
        raise APIException(
            error="邮箱格式不正确",
            code=ErrorCode.VALIDATION_ERROR,
            details={"field": "email", "value": email}
        )
    return APIResponse.success(message="邮箱格式正确")


@router.get("/exception/unauthorized")
async def unauthorized_exception():
    """未授权异常示例"""
    raise APIException(
        error="请先登录",
        code=ErrorCode.UNAUTHORIZED
    )
    # 返回 HTTP 401


@router.get("/exception/forbidden")
async def forbidden_exception():
    """禁止访问异常示例"""
    raise APIException(
        error="您没有权限执行此操作",
        code=ErrorCode.FORBIDDEN
    )
    # 返回 HTTP 403


@router.get("/exception/external-service")
async def external_service_exception():
    """外部服务错误示例"""
    raise APIException(
        error="Ollama服务连接失败",
        code=ErrorCode.OLLAMA_SERVICE_ERROR,
        details={"service": "ollama", "endpoint": "http://localhost:11434"}
    )
    # 返回 HTTP 502


# ============ 实际业务场景示例 ============

@router.get("/users/{user_id}")
async def get_user(user_id: int):
    """
    获取用户详情 - 实际业务场景示例
    
    演示如何在实际业务中处理各种情况：
    - 参数验证
    - 资源查找
    - 错误处理
    """
    # 1. 参数验证
    if user_id <= 0:
        return APIResponse.error(
            error="用户ID必须大于0",
            code=ErrorCode.INVALID_PARAMETER,
            details={"field": "user_id", "value": user_id}
        )
    
    # 2. 模拟数据库查询
    # 在实际应用中，这里会查询数据库
    users_db = {
        1: {"id": 1, "username": "张三", "email": "zhangsan@example.com"},
        2: {"id": 2, "username": "李四", "email": "lisi@example.com"},
    }
    
    user = users_db.get(user_id)
    
    # 3. 资源不存在处理
    if not user:
        return APIResponse.not_found(resource="用户")
    
    # 4. 返回成功响应
    return APIResponse.success(data=user, message="获取用户成功")


@router.post("/users")
async def create_user(user: UserCreate):
    """
    创建用户 - 实际业务场景示例
    
    演示如何处理创建操作：
    - 数据验证
    - 重复检查
    - 成功响应
    """
    # 1. 验证邮箱格式（实际应用中使用Pydantic验证）
    if "@" not in user.email:
        return APIResponse.validation_error(
            error="邮箱格式不正确",
            details={"field": "email", "value": user.email}
        )
    
    # 2. 检查用户名是否已存在（模拟）
    existing_users = ["张三", "李四"]
    if user.username in existing_users:
        return APIResponse.error(
            error=f"用户名 '{user.username}' 已存在",
            code=ErrorCode.RESOURCE_ALREADY_EXISTS
        )
    
    # 3. 创建用户（模拟）
    new_user = {
        "id": 3,
        "username": user.username,
        "email": user.email
    }
    
    # 4. 返回创建成功响应
    return APIResponse.created(data=new_user, message="用户创建成功")


@router.get("/users")
async def list_users(
    page: int = 1,
    page_size: int = 10,
    keyword: Optional[str] = None
):
    """
    获取用户列表 - 实际业务场景示例
    
    演示如何处理列表查询：
    - 分页参数验证
    - 搜索过滤
    - 分页响应
    """
    # 1. 参数验证
    if page < 1:
        return APIResponse.error(
            error="页码必须大于等于1",
            code=ErrorCode.INVALID_PARAMETER,
            details={"field": "page", "value": page}
        )
    
    if page_size < 1 or page_size > 100:
        return APIResponse.error(
            error="每页大小必须在1-100之间",
            code=ErrorCode.INVALID_PARAMETER,
            details={"field": "page_size", "value": page_size}
        )
    
    # 2. 模拟数据查询
    all_users = [
        {"id": i, "username": f"用户{i}", "email": f"user{i}@example.com"}
        for i in range(1, 51)  # 50条数据
    ]
    
    # 3. 搜索过滤
    if keyword:
        all_users = [
            u for u in all_users
            if keyword.lower() in u["username"].lower()
            or keyword.lower() in u["email"].lower()
        ]
    
    # 4. 分页
    total = len(all_users)
    start = (page - 1) * page_size
    end = start + page_size
    page_data = all_users[start:end]
    
    # 5. 返回分页响应
    return APIResponse.paginated(
        data=page_data,
        total=total,
        page=page,
        page_size=page_size,
        message=f"获取用户列表成功，共 {total} 条记录"
    )


# ============ 错误码参考 ============

"""
错误码列表:

通用错误 (1000-1099):
- 1000: UNKNOWN_ERROR - 未知错误
- 1001: INVALID_PARAMETER - 参数无效
- 1002: MISSING_PARAMETER - 缺少必要参数
- 1003: INVALID_FORMAT - 格式错误
- 1004: OPERATION_FAILED - 操作失败

认证授权错误 (2000-2099):
- 2000: UNAUTHORIZED - 未授权访问
- 2001: FORBIDDEN - 禁止访问
- 2002: TOKEN_EXPIRED - 令牌已过期
- 2003: INVALID_TOKEN - 无效的令牌

资源错误 (3000-3099):
- 3000: RESOURCE_NOT_FOUND - 资源不存在
- 3001: RESOURCE_ALREADY_EXISTS - 资源已存在
- 3002: RESOURCE_CONFLICT - 资源冲突
- 3003: RESOURCE_LIMIT_EXCEEDED - 超出资源限制

数据库错误 (4000-4099):
- 4000: DATABASE_ERROR - 数据库错误
- 4001: DATABASE_CONNECTION_ERROR - 数据库连接失败
- 4002: DATABASE_QUERY_ERROR - 数据库查询错误
- 4003: DATABASE_CONSTRAINT_ERROR - 数据约束冲突

业务逻辑错误 (5000-5099):
- 5000: BUSINESS_LOGIC_ERROR - 业务逻辑错误
- 5001: VALIDATION_ERROR - 数据验证失败
- 5002: OPERATION_NOT_ALLOWED - 操作不允许
- 5003: INSUFFICIENT_RESOURCES - 资源不足

外部服务错误 (6000-6099):
- 6000: EXTERNAL_SERVICE_ERROR - 外部服务错误
- 6001: OLLAMA_SERVICE_ERROR - Ollama服务错误
- 6002: FILE_SERVICE_ERROR - 文件服务错误
- 6003: VECTOR_SERVICE_ERROR - 向量服务错误

任务执行错误 (7000-7099):
- 7000: TASK_ERROR - 任务执行错误
- 7001: TASK_TIMEOUT - 任务执行超时
- 7002: TASK_CANCELLED - 任务已取消
- 7003: TASK_EXECUTION_ERROR - 任务执行失败
"""


# 便捷导出
__all__ = ["router"]
