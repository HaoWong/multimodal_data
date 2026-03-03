from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/multimodal_rag"
    
    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_embedding_model: str = "bge-m3:latest"
    ollama_chat_model: str = "qwen3:0.6b"
    ollama_vision_model: str = "qwen3:0.6b"
    
    # Application
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True
    
    # Vector Settings
    vector_dimension: int = 1024
    top_k_retrieval: int = 5
    similarity_threshold: float = 0.7
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
