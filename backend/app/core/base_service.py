"""基础服务类 - 提供通用的CRUD和向量搜索功能"""
from typing import TypeVar, Generic, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import Base

T = TypeVar('T', bound=Base)


class BaseService(Generic[T]):
    """基础服务类"""
    
    def __init__(self, db: Session, model: type[T]):
        self.db = db
        self.model = model
    
    def get(self, id: str) -> Optional[T]:
        """根据ID获取"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def list(self, skip: int = 0, limit: int = 100) -> List[T]:
        """列表查询"""
        return self.db.query(self.model).offset(skip).limit(limit).all()
    
    def create(self, **kwargs) -> T:
        """创建"""
        obj = self.model(**kwargs)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj
    
    def delete(self, id: str) -> bool:
        """删除"""
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False
    
    def vector_search(
        self,
        query_embedding: List[float],
        threshold: float = 0.5,
        top_k: int = 5,
        extra_filters: str = ""
    ) -> List[Dict[str, Any]]:
        """向量搜索 - 子类需要定义 embedding_column 和 return_columns"""
        raise NotImplementedError


class VectorSearchMixin:
    """向量搜索混入类"""
    
    embedding_column: str = "embedding"
    
    def _vector_search_query(
        self,
        query_embedding: List[float],
        threshold: float,
        top_k: int,
        select_columns: str,
        extra_where: str = ""
    ) -> str:
        """构建向量搜索SQL"""
        return f"""
            SELECT {select_columns},
                1 - ({self.embedding_column} <=> :embedding) as similarity
            FROM {self.__tablename__}
            WHERE 1 - ({self.embedding_column} <=> :embedding) > :threshold
            {extra_where}
            ORDER BY {self.embedding_column} <=> :embedding
            LIMIT :top_k
        """
