from sqlalchemy import Column, String, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import TypeDecorator
from pgvector.sqlalchemy import Vector
from app.core.database import Base
import uuid
import json
from datetime import datetime, timezone


class JSONWithChinese(TypeDecorator):
    """自定义JSON类型，确保中文不被转义"""
    impl = JSONB

    def process_bind_param(self, value, dialect):
        if value is None:
            return {} if self.impl == JSONB else []
        # 直接返回字典/列表，让 SQLAlchemy 和 PostgreSQL 处理 JSONB
        # 不要在这里进行 json.dumps/json.loads，这会破坏中文
        return value

    def process_result_value(self, value, dialect):
        return value

def utc_now():
    """返回UTC时间"""
    return datetime.now(timezone.utc)


class Document(Base):
    """文档模型"""
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    doc_type = Column(String(50), default="text")  # text, pdf, docx
    doc_metadata = Column(JSONWithChinese, default=dict)
    embedding = Column(Vector(1024))  # BGE-M3 向量维度
    file_path = Column(String(500), nullable=True)  # 关联的文件路径（如果有）
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class Image(Base):
    """图片模型"""
    __tablename__ = "images"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_path = Column(String(500), nullable=False)
    description = Column(Text)
    description_embedding = Column(Vector(1024))
    image_metadata = Column(JSONWithChinese, default=dict)
    created_at = Column(DateTime, default=utc_now)


class Conversation(Base):
    """对话记录模型"""
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(100), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    sources = Column(JSONWithChinese, default=list)  # 引用来源
    created_at = Column(DateTime, default=utc_now)


class KnowledgeBase(Base):
    """知识库模型"""
    __tablename__ = "knowledge_bases"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    kb_metadata = Column(JSONWithChinese, default=dict)
    document_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
