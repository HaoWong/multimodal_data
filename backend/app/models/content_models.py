"""
统一内容模型 - 支持多模态数据存储
文本、图片、视频统一存储和检索
"""
from sqlalchemy import Column, String, DateTime, Text, Enum, Index, Integer, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import TypeDecorator
from pgvector.sqlalchemy import Vector
import uuid
import json
from datetime import datetime, timezone
import enum

from app.core.database import Base


class JSONWithChinese(TypeDecorator):
    """自定义JSON类型，确保中文不被转义"""
    impl = JSONB
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return {}
        # 直接返回字典，让 SQLAlchemy 和 PostgreSQL 处理 JSONB
        # 不要在这里进行 json.dumps/json.loads，这会破坏中文
        return value
    
    def process_result_value(self, value, dialect):
        return value


def utc_now():
    """返回UTC时间"""
    return datetime.now(timezone.utc)


class ContentType(str, enum.Enum):
    """内容类型 - 必须与PostgreSQL枚举类型contenttype的值一致（大写）"""
    TEXT = "TEXT"      # 文本文档
    IMAGE = "IMAGE"    # 图片
    VIDEO = "VIDEO"    # 视频
    AUDIO = "AUDIO"    # 音频


class Content(Base):
    """统一内容模型"""
    __tablename__ = "contents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 内容类型
    content_type = Column(Enum(ContentType), nullable=False, index=True)
    
    # 文件信息
    source_path = Column(String(500), nullable=False)  # 原始文件路径
    original_name = Column(String(500), nullable=False)  # 原始文件名
    file_size = Column(Integer, default=0)  # 文件大小
    mime_type = Column(String(100), nullable=True)  # MIME类型
    
    # 提取的内容
    extracted_text = Column(Text, nullable=True)  # 提取的文本（文档）
    description = Column(Text, nullable=True)  # 描述（图片/视频/音频）
    
    # 向量嵌入 - 统一使用1024维
    embedding = Column(Vector(1024), nullable=True)
    
    # 元数据
    content_metadata = Column(JSONWithChinese, default=dict)  # 扩展元数据
    
    # 时间戳
    created_at = Column(DateTime, default=utc_now, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # 索引
    __table_args__ = (
        Index('idx_content_type_created', 'content_type', 'created_at'),
        Index('idx_content_embedding', 'embedding', postgresql_using='ivfflat'),
    )
    
    def to_dict(self) -> dict:
        """转换为字典"""
        import os
        # 构建URL（仅对视频/图片/音频类型）
        url = None
        if self.content_type.value in ["VIDEO", "IMAGE", "AUDIO"]:
            url = f"/uploads/contents/{os.path.basename(self.source_path)}"
        
        return {
            "id": str(self.id),
            "content_type": self.content_type.value,
            "original_name": self.original_name,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "url": url,
            "extracted_text": self.extracted_text[:500] + "..." if self.extracted_text and len(self.extracted_text) > 500 else self.extracted_text,
            "description": self.description,
            "metadata": self.content_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ContentChunk(Base):
    """内容分块（用于长文档）"""
    __tablename__ = "content_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # 分块信息
    chunk_index = Column(Integer, nullable=False)  # 分块序号
    chunk_text = Column(Text, nullable=False)  # 分块文本
    
    # 向量
    embedding = Column(Vector(1024), nullable=True)
    
    # 元数据
    chunk_metadata = Column(JSONWithChinese, default=dict)
    created_at = Column(DateTime, default=utc_now)
    
    # 索引
    __table_args__ = (
        Index('idx_chunk_content_id', 'content_id', 'chunk_index'),
    )


class VideoFrame(Base):
    """视频帧（用于视频内容分析）"""
    __tablename__ = "video_frames"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # 帧信息
    frame_path = Column(String(500), nullable=False)  # 帧图片路径
    timestamp = Column(Float, nullable=False)  # 时间戳（秒）
    frame_number = Column(Integer, nullable=False)  # 帧序号
    
    # 分析结果
    description = Column(Text, nullable=True)  # 帧描述
    description_embedding = Column(Vector(1024), nullable=True)  # 描述向量
    
    created_at = Column(DateTime, default=utc_now)
    
    # 索引
    __table_args__ = (
        Index('idx_frame_content_time', 'content_id', 'timestamp'),
    )
