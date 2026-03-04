"""
Pytest 配置文件 - 测试配置和共享fixture
"""
import pytest
import sys
import os

# 添加backend到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.database_models import Base
from app.models import content_models  # 导入以注册所有模型
from fastapi.testclient import TestClient

settings = get_settings()


@pytest.fixture(scope="session")
def engine():
    """创建数据库引擎 - 使用实际PostgreSQL数据库"""
    # 使用实际的数据库URL
    database_url = settings.database_url
    
    engine = create_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300
    )
    
    # 初始化pgvector扩展
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    """创建数据库会话 - 每个测试函数独立，使用事务回滚清理数据"""
    # 创建所有表（如果不存在）
    Base.metadata.create_all(bind=engine)
    
    # 创建会话 - 不使用嵌套事务，直接创建新连接
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        yield session
    finally:
        # 回滚事务，撤销测试期间的所有更改
        try:
            session.rollback()
        except:
            pass
        session.close()


@pytest.fixture(scope="function")
def client(engine):
    """创建FastAPI测试客户端 - 每个测试独立数据库连接"""
    from app.main import app
    from app.core.database import get_db
    
    # 创建新的会话
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    # 覆盖get_db依赖
    def override_get_db():
        try:
            yield session
        finally:
            try:
                session.rollback()
            except:
                pass
            session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # 清理依赖覆盖
    app.dependency_overrides.clear()
    try:
        session.rollback()
        session.close()
    except:
        pass


@pytest.fixture
def sample_document_data():
    """示例文档数据"""
    return {
        "title": "测试文档",
        "content": "这是测试文档的内容",
        "doc_type": "text",
        "metadata": {"author": "test", "category": "test"}
    }


@pytest.fixture
def sample_chat_request():
    """示例聊天请求数据"""
    return {
        "message": "你好",
        "use_rag": False
    }
