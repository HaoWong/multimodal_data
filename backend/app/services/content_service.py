"""
内容服务 - 继承BaseService，支持多模态内容管理
文本、图片、视频统一存储和检索
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
import os

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.base_service import BaseService, ServiceResponse, NotFoundError
from app.models.content_models import Content, ContentType, ContentChunk, VideoFrame
from app.services.ollama_client import ollama_client
from app.core.config import get_settings

settings = get_settings()


class ContentService(BaseService[Content]):
    """
    内容服务 - 管理多模态内容（文本、图片、视频、音频）
    继承BaseService获得通用CRUD和向量搜索能力
    """
    
    model_class = Content
    embedding_column = "embedding"
    
    def __init__(self, db: Session):
        super().__init__(db)
    
    def _prepare_create_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """预处理创建数据 - 处理content_type枚举"""
        # 确保content_type是枚举类型
        if 'content_type' in data and isinstance(data['content_type'], str):
            try:
                data['content_type'] = ContentType(data['content_type'].upper())
            except ValueError:
                pass
        return data
    
    # ==================== 内容创建（带向量生成）====================
    
    async def create_with_embedding(
        self,
        source_path: str,
        original_name: str,
        content_type: ContentType | str,
        extracted_text: str = None,
        description: str = None,
        file_size: int = 0,
        mime_type: str = None,
        metadata: Dict = None
    ) -> ServiceResponse:
        """
        创建内容并自动生成向量嵌入
        
        Args:
            source_path: 文件存储路径
            original_name: 原始文件名
            content_type: 内容类型
            extracted_text: 提取的文本（文档）
            description: 描述（图片/视频/音频）
            file_size: 文件大小
            mime_type: MIME类型
            metadata: 扩展元数据
        """
        try:
            # 确定用于生成向量的文本
            embedding_text = extracted_text or description or original_name
            
            # 生成向量
            embedding = None
            if embedding_text:
                try:
                    embeddings = await ollama_client.embed([embedding_text])
                    embedding = embeddings[0] if embeddings else None
                except Exception as e:
                    print(f"[ContentService] 向量生成失败: {e}")
            
            # 转换content_type
            if isinstance(content_type, str):
                content_type = ContentType(content_type.upper())
            
            # 创建内容数据
            content_data = {
                "source_path": source_path,
                "original_name": original_name,
                "content_type": content_type,
                "extracted_text": extracted_text,
                "description": description,
                "file_size": file_size,
                "mime_type": mime_type,
                "content_metadata": metadata or {},
                "embedding": embedding
            }
            
            return self.create(content_data)
        except Exception as e:
            return self._handle_error("create_with_embedding", e)
    
    # ==================== 内容查询 ====================
    
    def get_by_content_type(
        self,
        content_type: ContentType | str,
        skip: int = 0,
        limit: int = 100
    ) -> ServiceResponse:
        """按内容类型获取列表"""
        if isinstance(content_type, str):
            content_type = ContentType(content_type.upper())
        
        return self.list(
            skip=skip,
            limit=limit,
            filters={"content_type": content_type},
            order_by="created_at",
            order_desc=True
        )
    
    def get_by_original_name(self, name: str) -> Optional[Content]:
        """通过原始文件名查找"""
        return self.db.query(Content).filter(
            Content.original_name.ilike(f"%{name}%")
        ).first()
    
    def get_latest(self, content_type: ContentType = None) -> Optional[Content]:
        """获取最新上传的内容"""
        query = self.db.query(Content)
        if content_type:
            query = query.filter(Content.content_type == content_type)
        return query.order_by(Content.created_at.desc()).first()
    
    # ==================== 向量搜索（增强版）====================
    
    async def search_by_type(
        self,
        query: str,
        content_type: ContentType | str,
        top_k: int = 5,
        threshold: float = None
    ) -> ServiceResponse:
        """
        按内容类型进行语义搜索
        
        Args:
            query: 查询文本
            content_type: 内容类型过滤
            top_k: 返回结果数
            threshold: 相似度阈值
        """
        if isinstance(content_type, str):
            content_type = ContentType(content_type.upper())
        
        extra_filters = f"AND content_type = '{content_type.value}'"
        
        return await self.search(
            query=query,
            top_k=top_k,
            threshold=threshold,
            extra_filters=extra_filters
        )
    
    async def search_all_types(
        self,
        query: str,
        top_k: int = 5,
        threshold: float = None
    ) -> Dict[str, List[Dict]]:
        """
        搜索所有内容类型，按类型分组返回
        
        Returns:
            {"TEXT": [...], "IMAGE": [...], "VIDEO": [...], "AUDIO": [...]}
        """
        result = await self.search(query=query, top_k=top_k, threshold=threshold)
        
        if not result.success:
            return {t.value: [] for t in ContentType}
        
        # 按类型分组
        grouped = {t.value: [] for t in ContentType}
        for item in result.data:
            content_type = item.get("content_type", "TEXT")
            if isinstance(content_type, ContentType):
                content_type = content_type.value
            grouped.setdefault(content_type, []).append(item)
        
        return grouped
    
    # ==================== 内容处理 ====================
    
    def to_search_result(self, content: Content, similarity: float = None) -> Dict[str, Any]:
        """
        将Content对象转换为搜索结果格式
        
        Args:
            content: Content对象
            similarity: 相似度分数
        """
        content_type_value = content.content_type
        if hasattr(content_type_value, 'value'):
            content_type_value = content_type_value.value
        
        text_content = content.extracted_text or content.description or ""
        
        result = {
            "id": str(content.id),
            "title": content.original_name,
            "text": text_content[:500] + "..." if len(text_content) > 500 else text_content,
            "content_type": content_type_value,
            "source": "内容库",
            "similarity": round(float(similarity), 3) if similarity else 1.0,
            "file_size": content.file_size,
            "mime_type": content.mime_type,
            "created_at": content.created_at.isoformat() if content.created_at else None
        }
        
        # 添加URL（如果是媒体文件）
        if content_type_value in ["IMAGE", "VIDEO", "AUDIO"]:
            result["url"] = f"/uploads/contents/{os.path.basename(content.source_path)}"
        
        return result
    
    def build_context_from_content(self, content: Content) -> str:
        """从Content构建上下文文本"""
        content_type_value = content.content_type
        if hasattr(content_type_value, 'value'):
            content_type_value = content_type_value.value
        
        title = content.original_name
        text_content = content.extracted_text or content.description or ""
        
        if content_type_value == "IMAGE":
            return f"[图片] {title}:\n图片描述: {text_content}"
        elif content_type_value == "VIDEO":
            return f"[视频] {title}:\n视频描述: {text_content}"
        elif content_type_value == "AUDIO":
            return f"[音频] {title}:\n音频描述: {text_content}"
        else:
            return f"[文档] {title}:\n{text_content}"
    
    # ==================== 文件管理 ====================
    
    def _before_delete(self, obj: Content):
        """删除前钩子 - 删除关联的文件"""
        if obj.source_path and os.path.exists(obj.source_path):
            try:
                os.remove(obj.source_path)
                print(f"[ContentService] 删除文件: {obj.source_path}")
            except Exception as e:
                print(f"[ContentService] 删除文件失败: {e}")
    
    async def update_description(
        self,
        content_id: UUID | str,
        description: str,
        regenerate_embedding: bool = True
    ) -> ServiceResponse:
        """
        更新内容描述，可选重新生成向量
        
        Args:
            content_id: 内容ID
            description: 新描述
            regenerate_embedding: 是否重新生成向量
        """
        try:
            update_data = {"description": description}
            
            if regenerate_embedding:
                try:
                    embeddings = await ollama_client.embed([description])
                    if embeddings:
                        update_data["embedding"] = embeddings[0]
                except Exception as e:
                    print(f"[ContentService] 重新生成向量失败: {e}")
            
            return self.update(content_id, update_data)
        except Exception as e:
            return self._handle_error("update_description", e)
    
    # ==================== 批量操作 ====================
    
    async def bulk_create_with_embeddings(
        self,
        items: List[Dict[str, Any]],
        batch_size: int = 10
    ) -> ServiceResponse:
        """
        批量创建内容并生成向量
        
        Args:
            items: 内容数据列表
            batch_size: 批处理大小
        """
        try:
            created_items = []
            failed_items = []
            
            for i, item in enumerate(items):
                try:
                    # 提取用于生成向量的文本
                    embedding_text = item.get("extracted_text") or item.get("description") or item.get("original_name", "")
                    
                    # 生成向量
                    embedding = None
                    if embedding_text:
                        try:
                            embeddings = await ollama_client.embed([embedding_text])
                            embedding = embeddings[0] if embeddings else None
                        except Exception as e:
                            print(f"[ContentService] 批量向量生成失败: {e}")
                    
                    item["embedding"] = embedding
                    
                    # 转换content_type
                    if isinstance(item.get("content_type"), str):
                        item["content_type"] = ContentType(item["content_type"].upper())
                    
                    result = self.create(item, commit=False)
                    if result.success:
                        created_items.append(result.data)
                    else:
                        failed_items.append({"item": item, "error": result.message})
                    
                    # 批量提交
                    if (i + 1) % batch_size == 0:
                        self.db.commit()
                        
                except Exception as e:
                    failed_items.append({"item": item, "error": str(e)})
            
            # 最终提交
            self.db.commit()
            
            return ServiceResponse.ok(
                data={
                    "created": created_items,
                    "failed": failed_items,
                    "total": len(items),
                    "success_count": len(created_items),
                    "failed_count": len(failed_items)
                },
                message=f"批量创建完成: 成功 {len(created_items)}, 失败 {len(failed_items)}"
            )
        except Exception as e:
            self.db.rollback()
            return self._handle_error("bulk_create_with_embeddings", e)


# ==================== ContentChunk服务 ====================

class ContentChunkService(BaseService[ContentChunk]):
    """内容分块服务"""
    
    model_class = ContentChunk
    embedding_column = "embedding"
    
    def __init__(self, db: Session):
        super().__init__(db)
    
    def get_by_content_id(
        self,
        content_id: UUID | str,
        skip: int = 0,
        limit: int = 100
    ) -> ServiceResponse:
        """获取指定内容的分块"""
        return self.list(
            skip=skip,
            limit=limit,
            filters={"content_id": content_id},
            order_by="chunk_index",
            order_desc=False
        )
    
    async def create_chunk(
        self,
        content_id: UUID | str,
        chunk_index: int,
        chunk_text: str,
        metadata: Dict = None
    ) -> ServiceResponse:
        """创建分块并生成向量"""
        try:
            # 生成向量
            embedding = None
            if chunk_text:
                try:
                    embeddings = await ollama_client.embed([chunk_text])
                    embedding = embeddings[0] if embeddings else None
                except Exception as e:
                    print(f"[ContentChunkService] 向量生成失败: {e}")
            
            chunk_data = {
                "content_id": content_id,
                "chunk_index": chunk_index,
                "chunk_text": chunk_text,
                "chunk_metadata": metadata or {},
                "embedding": embedding
            }
            
            return self.create(chunk_data)
        except Exception as e:
            return self._handle_error("create_chunk", e)
    
    async def search_chunks(
        self,
        query: str,
        content_id: UUID | str = None,
        top_k: int = 5
    ) -> ServiceResponse:
        """搜索分块"""
        extra_filters = ""
        if content_id:
            extra_filters = f"AND content_id = '{content_id}'"
        
        return await self.search(
            query=query,
            top_k=top_k,
            extra_filters=extra_filters
        )


# ==================== VideoFrame服务 ====================

class VideoFrameService(BaseService[VideoFrame]):
    """视频帧服务"""
    
    model_class = VideoFrame
    embedding_column = "description_embedding"
    
    def __init__(self, db: Session):
        super().__init__(db)
    
    def get_by_content_id(
        self,
        content_id: UUID | str,
        skip: int = 0,
        limit: int = 100
    ) -> ServiceResponse:
        """获取指定视频的帧"""
        return self.list(
            skip=skip,
            limit=limit,
            filters={"content_id": content_id},
            order_by="timestamp",
            order_desc=False
        )
    
    async def create_frame(
        self,
        content_id: UUID | str,
        frame_path: str,
        timestamp: float,
        frame_number: int,
        description: str = None
    ) -> ServiceResponse:
        """创建视频帧并生成描述向量"""
        try:
            # 生成描述向量
            embedding = None
            if description:
                try:
                    embeddings = await ollama_client.embed([description])
                    embedding = embeddings[0] if embeddings else None
                except Exception as e:
                    print(f"[VideoFrameService] 向量生成失败: {e}")
            
            frame_data = {
                "content_id": content_id,
                "frame_path": frame_path,
                "timestamp": timestamp,
                "frame_number": frame_number,
                "description": description,
                "description_embedding": embedding
            }
            
            return self.create(frame_data)
        except Exception as e:
            return self._handle_error("create_frame", e)
    
    async def search_frames(
        self,
        query: str,
        content_id: UUID | str = None,
        top_k: int = 5
    ) -> ServiceResponse:
        """搜索视频帧"""
        extra_filters = ""
        if content_id:
            extra_filters = f"AND content_id = '{content_id}'"
        
        return await self.search(
            query=query,
            top_k=top_k,
            extra_filters=extra_filters
        )
