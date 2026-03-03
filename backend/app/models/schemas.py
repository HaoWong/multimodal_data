from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime
from uuid import UUID


# ==================== 基础响应 ====================

class BaseResponse(BaseModel):
    """基础响应模型"""
    success: bool = True
    message: str = "操作成功"


# ==================== 文档相关 ====================

class DocumentCreate(BaseModel):
    """创建文档请求"""
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    doc_type: Literal["text", "pdf", "docx"] = "text"
    metadata: Optional[dict] = Field(default_factory=dict)


class DocumentResponse(BaseModel):
    """文档响应"""
    id: UUID
    title: str
    content: str
    doc_type: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    
    @model_validator(mode='before')
    @classmethod
    def extract_metadata(cls, data):
        """从 doc_metadata 提取 metadata"""
        if hasattr(data, 'doc_metadata'):
            data = dict(data.__dict__)
            data['metadata'] = data.pop('doc_metadata', {})
        elif isinstance(data, dict) and 'doc_metadata' in data:
            data['metadata'] = data.pop('doc_metadata')
        return data
    
    model_config = ConfigDict(from_attributes=True)


class DocumentSearchResult(BaseModel):
    """文档搜索结果"""
    id: UUID
    title: str
    content: str
    similarity: float


# ==================== 图片相关 ====================

class ImageUploadResponse(BaseModel):
    """图片上传响应"""
    id: UUID
    image_url: str
    description: Optional[str] = None
    message: str = "图片上传成功"


class ImageSearchResult(BaseModel):
    """图片搜索结果"""
    id: UUID
    image_url: str
    description: str
    similarity: float


# ==================== 对话相关 ====================

class ChatMessage(BaseModel):
    """聊天消息"""
    role: Literal["user", "assistant", "system"]
    content: str
    sources: Optional[List[dict]] = None
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    use_rag: bool = True
    history: Optional[List[ChatMessage]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """聊天响应"""
    response: str
    sources: List[dict] = Field(default_factory=list)
    session_id: str


class ChatStreamChunk(BaseModel):
    """流式聊天块"""
    chunk: str
    is_end: bool = False


# ==================== 搜索相关 ====================

class SearchRequest(BaseModel):
    """搜索请求"""
    query: str = Field(..., min_length=1)
    search_type: Literal["text", "image", "all"] = "all"
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResponse(BaseModel):
    """搜索响应"""
    text_results: List[DocumentSearchResult] = Field(default_factory=list)
    image_results: List[ImageSearchResult] = Field(default_factory=list)
    total_results: int = 0
