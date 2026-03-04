"""
基础服务类 - 提供通用的CRUD和向量搜索功能
支持泛型、统一错误处理、向量操作
"""
from typing import TypeVar, Generic, List, Optional, Dict, Any, Type, Callable
from sqlalchemy.orm import Session
from sqlalchemy import text, desc, asc
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
import uuid
from datetime import datetime
from abc import ABC, abstractmethod
import traceback

from pydantic import BaseModel

from app.core.database import Base
from app.core.config import get_settings

settings = get_settings()

T = TypeVar('T', bound=Base)
CreateSchema = TypeVar('CreateSchema')
UpdateSchema = TypeVar('UpdateSchema')


class ServiceError(Exception):
    """服务层错误"""
    def __init__(self, message: str, code: str = "SERVICE_ERROR", details: Dict = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(ServiceError):
    """资源不存在错误"""
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with id {identifier} not found",
            code="NOT_FOUND",
            details={"resource": resource, "id": str(identifier)}
        )


class ValidationError(ServiceError):
    """验证错误"""
    def __init__(self, message: str, field: str = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details={"field": field} if field else {}
        )


class VectorSearchError(ServiceError):
    """向量搜索错误"""
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(
            message=message,
            code="VECTOR_SEARCH_ERROR",
            details={"original_error": str(original_error)} if original_error else {}
        )


class ServiceResponse(BaseModel):
    """统一服务响应格式"""
    success: bool = True
    data: Any = None
    message: str = ""
    error_code: Optional[str] = None
    error_details: Optional[Dict] = None
    meta: Optional[Dict] = None

    @classmethod
    def ok(cls, data: Any = None, message: str = "操作成功", meta: Dict = None):
        return cls(success=True, data=data, message=message, meta=meta)
    
    @classmethod
    def error(cls, message: str, code: str = "ERROR", details: Dict = None):
        return cls(
            success=False,
            message=message,
            error_code=code,
            error_details=details
        )
    
    @classmethod
    def from_exception(cls, exc: ServiceError):
        return cls.error(
            message=exc.message,
            code=exc.code,
            details=exc.details
        )


class BaseService(Generic[T], ABC):
    """
    基础服务抽象基类
    
    提供通用的CRUD操作和向量搜索功能
    子类需要实现:
    - model_class: 数据模型类
    - embedding_column: 向量字段名（用于向量搜索）
    """
    
    model_class: Type[T] = None
    embedding_column: str = "embedding"
    default_vector_dimension: int = 1024
    
    def __init__(self, db: Session):
        self.db = db
        self._validate_model_class()
    
    def _validate_model_class(self):
        """验证模型类是否正确设置"""
        if self.model_class is None:
            raise ServiceError(
                message="model_class must be defined in subclass",
                code="CONFIGURATION_ERROR"
            )
    
    # ==================== CRUD 操作 ====================
    
    def get_by_id(self, id: UUID | str) -> Optional[T]:
        """通过ID获取单条记录"""
        try:
            if isinstance(id, str):
                id = UUID(id)
            return self.db.query(self.model_class).filter(self.model_class.id == id).first()
        except SQLAlchemyError as e:
            self._handle_db_error("get_by_id", e)
            return None
    
    def get_or_404(self, id: UUID | str) -> T:
        """通过ID获取记录，不存在则抛出NotFoundError"""
        obj = self.get_by_id(id)
        if obj is None:
            raise NotFoundError(
                resource=self.model_class.__name__,
                identifier=id
            )
        return obj
    
    def get(
        self, 
        id: UUID | str,
        *,
        include_deleted: bool = False
    ) -> ServiceResponse:
        """获取单条记录（带响应包装）"""
        try:
            obj = self.get_by_id(id)
            if obj is None:
                return ServiceResponse.error(
                    message=f"{self.model_class.__name__} not found",
                    code="NOT_FOUND"
                )
            return ServiceResponse.ok(data=obj)
        except ServiceError:
            raise
        except Exception as e:
            return self._handle_error("get", e)
    
    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = None,
        order_desc: bool = True,
        filters: Dict[str, Any] = None
    ) -> ServiceResponse:
        """
        列表查询
        
        Args:
            skip: 跳过记录数
            limit: 返回记录数限制
            order_by: 排序字段
            order_desc: 是否降序
            filters: 过滤条件字典
        """
        try:
            query = self.db.query(self.model_class)
            
            # 应用过滤条件
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model_class, key) and value is not None:
                        query = query.filter(getattr(self.model_class, key) == value)
            
            # 排序
            if order_by and hasattr(self.model_class, order_by):
                order_column = getattr(self.model_class, order_by)
                query = query.order_by(desc(order_column) if order_desc else asc(order_column))
            
            # 分页
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            
            return ServiceResponse.ok(
                data=items,
                meta={
                    "total": total,
                    "skip": skip,
                    "limit": limit,
                    "has_more": total > skip + limit
                }
            )
        except Exception as e:
            return self._handle_error("list", e)
    
    def create(
        self,
        obj_data: Dict[str, Any] | CreateSchema,
        *,
        commit: bool = True,
        refresh: bool = True
    ) -> ServiceResponse:
        """
        创建记录
        
        Args:
            obj_data: 创建数据（字典或Pydantic模型）
            commit: 是否立即提交
            refresh: 是否刷新对象
        """
        try:
            # 转换Pydantic模型为字典
            if hasattr(obj_data, 'model_dump'):
                data = obj_data.model_dump()
            elif hasattr(obj_data, 'dict'):
                data = obj_data.dict()
            else:
                data = dict(obj_data)
            
            # 预处理数据
            data = self._prepare_create_data(data)
            
            # 创建对象
            obj = self.model_class(**data)
            self.db.add(obj)
            
            if commit:
                self.db.commit()
                if refresh:
                    self.db.refresh(obj)
            
            return ServiceResponse.ok(
                data=obj,
                message=f"{self.model_class.__name__} created successfully"
            )
        except Exception as e:
            self.db.rollback()
            return self._handle_error("create", e)
    
    def update(
        self,
        id: UUID | str,
        obj_data: Dict[str, Any] | UpdateSchema,
        *,
        commit: bool = True,
        partial: bool = True
    ) -> ServiceResponse:
        """
        更新记录
        
        Args:
            id: 记录ID
            obj_data: 更新数据
            commit: 是否立即提交
            partial: 是否部分更新（True=只更新提供的字段）
        """
        try:
            obj = self.get_or_404(id)
            
            # 转换数据
            if hasattr(obj_data, 'model_dump'):
                data = obj_data.model_dump(exclude_unset=partial)
            elif hasattr(obj_data, 'dict'):
                data = obj_data.dict(exclude_unset=partial)
            else:
                data = dict(obj_data)
            
            # 预处理数据
            data = self._prepare_update_data(data, obj)
            
            # 更新字段
            for key, value in data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            
            # 更新时间戳
            if hasattr(obj, 'updated_at'):
                obj.updated_at = datetime.now()
            
            if commit:
                self.db.commit()
                self.db.refresh(obj)
            
            return ServiceResponse.ok(
                data=obj,
                message=f"{self.model_class.__name__} updated successfully"
            )
        except ServiceError:
            raise
        except Exception as e:
            self.db.rollback()
            return self._handle_error("update", e)
    
    def delete(
        self,
        id: UUID | str,
        *,
        commit: bool = True,
        soft_delete: bool = False
    ) -> ServiceResponse:
        """
        删除记录
        
        Args:
            id: 记录ID
            commit: 是否立即提交
            soft_delete: 是否软删除
        """
        try:
            obj = self.get_or_404(id)
            
            if soft_delete and hasattr(obj, 'is_deleted'):
                obj.is_deleted = True
                obj.deleted_at = datetime.now()
            else:
                # 执行删除前钩子
                self._before_delete(obj)
                self.db.delete(obj)
            
            if commit:
                self.db.commit()
            
            return ServiceResponse.ok(
                message=f"{self.model_class.__name__} deleted successfully"
            )
        except ServiceError:
            raise
        except Exception as e:
            self.db.rollback()
            return self._handle_error("delete", e)
    
    def bulk_create(
        self,
        items: List[Dict[str, Any]],
        *,
        batch_size: int = 100
    ) -> ServiceResponse:
        """批量创建"""
        try:
            created = []
            for i, item_data in enumerate(items):
                data = self._prepare_create_data(item_data)
                obj = self.model_class(**data)
                self.db.add(obj)
                created.append(obj)
                
                if (i + 1) % batch_size == 0:
                    self.db.commit()
            
            self.db.commit()
            return ServiceResponse.ok(
                data=created,
                message=f"Created {len(created)} {self.model_class.__name__} records"
            )
        except Exception as e:
            self.db.rollback()
            return self._handle_error("bulk_create", e)
    
    # ==================== 向量搜索 ====================
    
    async def search(
        self,
        query: str,
        *,
        top_k: int = None,
        threshold: float = None,
        extra_filters: str = "",
        select_columns: str = "*",
        return_model: bool = False
    ) -> ServiceResponse:
        """
        语义搜索（向量搜索）
        
        Args:
            query: 查询文本
            top_k: 返回结果数量
            threshold: 相似度阈值
            extra_filters: 额外SQL过滤条件
            select_columns: 选择列
            return_model: 是否返回模型实例
        """
        # 延迟导入避免循环依赖
        from app.services.ollama_client import ollama_client
        
        try:
            top_k = top_k or settings.top_k_retrieval
            threshold = threshold or settings.similarity_threshold
            
            # 生成查询向量
            embeddings = await ollama_client.embed([query])
            query_embedding = embeddings[0]
            
            return await self.vector_search(
                query_embedding=query_embedding,
                top_k=top_k,
                threshold=threshold,
                extra_filters=extra_filters,
                select_columns=select_columns,
                return_model=return_model
            )
        except Exception as e:
            return self._handle_error("search", e)
    
    async def vector_search(
        self,
        query_embedding: List[float],
        *,
        top_k: int = 5,
        threshold: float = 0.5,
        extra_filters: str = "",
        select_columns: str = "*",
        return_model: bool = False
    ) -> ServiceResponse:
        """
        向量搜索核心方法
        
        Args:
            query_embedding: 查询向量
            top_k: 返回结果数量
            threshold: 相似度阈值
            extra_filters: 额外SQL过滤条件
            select_columns: 选择列
            return_model: 是否返回模型实例
        """
        try:
            table_name = self.model_class.__tablename__
            
            # 构建SQL
            if select_columns == "*":
                select_cols = f"{table_name}.*"
            else:
                select_cols = select_columns
            
            sql = f"""
                SELECT {select_cols},
                    1 - ({self.embedding_column} <=> :embedding) as similarity
                FROM {table_name}
                WHERE 1 - ({self.embedding_column} <=> :embedding) > :threshold
                {extra_filters}
                ORDER BY {self.embedding_column} <=> :embedding
                LIMIT :top_k
            """
            
            result = self.db.execute(
                text(sql),
                {
                    "embedding": str(query_embedding),
                    "threshold": threshold,
                    "top_k": top_k
                }
            )
            
            items = []
            for row in result:
                if return_model:
                    # 转换为模型实例
                    item = self._row_to_model(row)
                else:
                    # 转换为字典
                    item = dict(row._mapping)
                    # 处理UUID和datetime序列化
                    item = self._serialize_for_json(item)
                items.append(item)
            
            return ServiceResponse.ok(
                data=items,
                meta={
                    "total": len(items),
                    "threshold": threshold,
                    "top_k": top_k
                }
            )
        except Exception as e:
            raise VectorSearchError(
                message=f"Vector search failed: {str(e)}",
                original_error=e
            )
    
    async def generate_and_save_embedding(
        self,
        obj_id: UUID | str,
        text: str,
        *,
        embedding_column: str = None
    ) -> ServiceResponse:
        """
        生成并保存向量嵌入
        
        Args:
            obj_id: 对象ID
            text: 要嵌入的文本
            embedding_column: 向量字段名（默认使用self.embedding_column）
        """
        # 延迟导入避免循环依赖
        from app.services.ollama_client import ollama_client
        
        try:
            # 生成向量
            embeddings = await ollama_client.embed([text])
            embedding = embeddings[0] if embeddings else None
            
            if embedding is None:
                return ServiceResponse.error(
                    message="Failed to generate embedding",
                    code="EMBEDDING_ERROR"
                )
            
            # 更新记录
            col_name = embedding_column or self.embedding_column
            obj = self.get_or_404(obj_id)
            setattr(obj, col_name, embedding)
            self.db.commit()
            
            return ServiceResponse.ok(
                data={"embedding_generated": True, "dimension": len(embedding)},
                message="Embedding generated and saved"
            )
        except ServiceError:
            raise
        except Exception as e:
            self.db.rollback()
            return self._handle_error("generate_and_save_embedding", e)
    
    # ==================== 可扩展钩子方法 ====================
    
    def _prepare_create_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """预处理创建数据 - 子类可重写"""
        return data
    
    def _prepare_update_data(self, data: Dict[str, Any], existing_obj: T) -> Dict[str, Any]:
        """预处理更新数据 - 子类可重写"""
        return data
    
    def _before_delete(self, obj: T):
        """删除前钩子 - 子类可重写"""
        pass
    
    def _row_to_model(self, row) -> T:
        """将查询结果行转换为模型实例 - 子类可重写"""
        return self.model_class(**{
            k: v for k, v in dict(row._mapping).items()
            if hasattr(self.model_class, k)
        })
    
    # ==================== 工具方法 ====================
    
    def _serialize_for_json(self, data: Dict) -> Dict:
        """序列化数据为JSON友好格式"""
        result = {}
        for key, value in data.items():
            if isinstance(value, UUID):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result
    
    def _handle_db_error(self, operation: str, error: SQLAlchemyError):
        """处理数据库错误"""
        print(f"[DB Error] {operation}: {error}")
        traceback.print_exc()
        raise ServiceError(
            message=f"Database error during {operation}: {str(error)}",
            code="DATABASE_ERROR",
            details={"operation": operation, "error": str(error)}
        )
    
    def _handle_error(self, operation: str, error: Exception) -> ServiceResponse:
        """处理通用错误并返回响应"""
        if isinstance(error, ServiceError):
            return ServiceResponse.from_exception(error)
        
        print(f"[Service Error] {operation}: {error}")
        traceback.print_exc()
        
        return ServiceResponse.error(
            message=f"Error during {operation}: {str(error)}",
            code="SERVICE_ERROR",
            details={"operation": operation, "error_type": type(error).__name__}
        )
    
    def count(self, filters: Dict[str, Any] = None) -> int:
        """统计记录数"""
        query = self.db.query(self.model_class)
        if filters:
            for key, value in filters.items():
                if hasattr(self.model_class, key) and value is not None:
                    query = query.filter(getattr(self.model_class, key) == value)
        return query.count()
    
    def exists(self, id: UUID | str) -> bool:
        """检查记录是否存在"""
        return self.get_by_id(id) is not None