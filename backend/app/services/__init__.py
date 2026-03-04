"""服务层模块"""
from app.services.ollama_client import ollama_client, OllamaClient
from app.services.chat_service import ChatService
from app.services.document_service import DocumentService
from app.services.content_service import (
    ContentService,
    ContentChunkService,
    VideoFrameService
)
from app.core.base_service import (
    BaseService,
    ServiceResponse,
    ServiceError,
    NotFoundError,
    ValidationError,
    VectorSearchError
)

__all__ = [
    # 客户端
    "ollama_client",
    "OllamaClient",
    # 服务类
    "ChatService",
    "DocumentService",
    "ContentService",
    "ContentChunkService",
    "VideoFrameService",
    # 基础类
    "BaseService",
    "ServiceResponse",
    "ServiceError",
    "NotFoundError",
    "ValidationError",
    "VectorSearchError",
]
