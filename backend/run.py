#!/usr/bin/env python3
"""
启动脚本
"""
import uvicorn
import os
from app.core.config import get_settings

settings = get_settings()

if __name__ == "__main__":
    print(f"🚀 启动多模态RAG系统 API服务器")
    print(f"📍 地址: http://{settings.app_host}:{settings.app_port}")
    print(f"📚 API文档: http://{settings.app_host}:{settings.app_port}/docs")
    
    # 配置 reload_dirs，避免监视系统文件
    reload_dirs = ["app"] if settings.debug else None
    
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug,
        reload_dirs=reload_dirs,
        log_level="info"
    )
