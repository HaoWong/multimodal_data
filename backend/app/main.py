from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json

from app.core.config import get_settings
from app.core.database import engine, Base, init_vector_extension
from app.core.response import CustomJSONResponse
from app.core.middleware import register_exception_handlers, LoggingMiddleware
from app.api import chat, contents, skills, agent, tasks
from app.skills import skill_registry


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    try:
        # 启动时执行
        print("🚀 正在初始化数据库...")
        init_vector_extension()
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库初始化完成")
        
        # 加载 Markdown Skills
        print("📝 正在加载 Markdown Skills...")
        skill_registry.initialize()
        print(f"✅ Skills加载完成: {len(skill_registry.list_skills())} 个技能")
        
    except Exception as e:
        print(f"⚠️ 初始化失败: {e}")
        print("请检查:")
        print("1. PostgreSQL 是否运行")
        print("2. 数据库配置是否正确")
        print("3. pgvector 扩展是否安装")
    
    yield
    
    # 关闭时执行
    print("👋 应用关闭")


# 创建FastAPI应用
app = FastAPI(
    title="多模态RAG系统 API",
    description="基于PostgreSQL + Ollama的多模态向量检索增强生成系统",
    version="1.1.0",
    lifespan=lifespan,
    default_response_class=CustomJSONResponse
)

# 注册全局异常处理器
register_exception_handlers(app)

# 添加请求日志中间件
app.add_middleware(LoggingMiddleware)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由 - 统一使用 /api 前缀
# 内容管理（已整合 documents 和 images）
app.include_router(contents.router, prefix="/api")

# 核心业务接口
app.include_router(chat.router, prefix="/api")     # 对话功能
app.include_router(agent.router, prefix="/api")    # Agent执行

# 管理接口
app.include_router(skills.router, prefix="/api")   # Skills管理
app.include_router(tasks.router, prefix="/api")    # 任务管理

# 静态文件服务
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 提供 favicon.ico
@app.get("/favicon.ico")
async def favicon():
    """返回网站图标"""
    favicon_path = os.path.join(os.path.dirname(__file__), "..", "static", "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    # 如果没有 favicon，返回空响应避免 404
    return {"message": "No favicon"}


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "多模态RAG系统 API",
        "version": "1.1.0",
        "docs": "/docs",
        "features": [
            "统一内容管理 (/contents/*)",
            "对话功能 (/chat/*)",
            "Agent执行 (/agent/*)",
            "Skills管理 (/skills/*)",
            "任务管理 (/tasks/*)",
            "向量检索增强"
        ],
        "migration_notice": {
            "documents": "已迁移到 /api/contents/documents/*",
            "images": "已迁移到 /api/contents/images/*"
        }
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug
    )
