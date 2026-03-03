from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID

from app.models.database_models import Document
from app.models.schemas import DocumentCreate, DocumentSearchResult
from app.services.ollama_client import ollama_client
from app.core.config import get_settings

settings = get_settings()


class DocumentService:
    """文档服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_document(self, doc_data: DocumentCreate) -> Document:
        """创建文档并生成向量嵌入"""
        # 生成向量嵌入
        embeddings = await ollama_client.embed([doc_data.content])
        embedding = embeddings[0] if embeddings else None
        
        # 创建文档记录
        document = Document(
            title=doc_data.title,
            content=doc_data.content,
            doc_type=doc_data.doc_type,
            doc_metadata=doc_data.metadata,
            embedding=embedding
        )
        
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        
        return document
    
    def get_document(self, doc_id: UUID) -> Optional[Document]:
        """获取单个文档"""
        return self.db.query(Document).filter(Document.id == doc_id).first()
    
    def list_documents(self, skip: int = 0, limit: int = 100) -> List[Document]:
        """列出文档"""
        return self.db.query(Document).offset(skip).limit(limit).all()
    
    async def search_similar(
        self,
        query: str,
        top_k: int = None,
        threshold: float = None
    ) -> List[DocumentSearchResult]:
        """语义搜索相似文档"""
        top_k = top_k or settings.top_k_retrieval
        threshold = threshold or settings.similarity_threshold
        
        # 生成查询向量
        embeddings = await ollama_client.embed([query])
        query_embedding = embeddings[0]
        
        # 执行向量相似度搜索
        sql = """
        SELECT 
            id,
            title,
            content,
            1 - (embedding <=> :query_embedding) as similarity
        FROM documents
        WHERE 1 - (embedding <=> :query_embedding) > :threshold
        ORDER BY embedding <=> :query_embedding
        LIMIT :top_k
        """
        
        result = self.db.execute(
            text(sql),
            {
                "query_embedding": str(query_embedding),
                "threshold": threshold,
                "top_k": top_k
            }
        )
        
        documents = []
        for row in result:
            documents.append(DocumentSearchResult(
                id=row.id,
                title=row.title,
                content=row.content[:500] + "..." if len(row.content) > 500 else row.content,
                similarity=row.similarity
            ))
        
        return documents
    
    def delete_document(self, doc_id: UUID) -> bool:
        """删除文档"""
        import os
        document = self.get_document(doc_id)
        if document:
            # 删除关联的文件（如果存在）
            if document.file_path and os.path.exists(document.file_path):
                try:
                    os.remove(document.file_path)
                except Exception as e:
                    print(f"删除文件失败: {e}")
            
            self.db.delete(document)
            self.db.commit()
            return True
        return False
