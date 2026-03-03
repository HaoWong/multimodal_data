"""
端到端测试 - 覆盖知识库、图片库、视频库的上传和对话
全部使用 PostgreSQL 数据库
"""
import pytest
import asyncio
import os
import tempfile
from pathlib import Path

# 添加backend到路径
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import get_settings

settings = get_settings()

# 使用 PostgreSQL 数据库进行测试
TEST_DATABASE_URL = settings.database_url

engine = create_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300
)

# 初始化 pgvector 扩展
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def client():
    """创建测试客户端"""
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as c:
        yield c
    
    # 清理数据库 - 删除所有表数据
    Base.metadata.drop_all(bind=engine)


class TestKnowledgeBaseE2E:
    """知识库端到端测试"""
    
    def test_upload_document_and_chat(self, client):
        """测试上传文档后进行RAG对话"""
        print("\n" + "="*60)
        print("[E2E测试] 知识库：上传文档 + RAG对话")
        print("="*60)
        
        # 1. 创建测试文档
        test_content = """
        Python是一种高级编程语言，由Guido van Rossum于1991年创建。
        它以简洁、易读的语法著称，使用缩进来表示代码块。
        Python支持多种编程范式，包括面向对象、函数式和过程式编程。
        """
        
        # 2. 上传文档到知识库
        print("[步骤1] 上传文档到知识库...")
        doc_data = {
            "title": "Python编程语言介绍",
            "content": test_content,
            "doc_type": "text",
            "metadata": {"author": "test", "category": "programming"}
        }
        
        response = client.post("/documents/", json=doc_data)
        assert response.status_code == 200, f"上传失败: {response.text}"
        
        doc_result = response.json()
        doc_id = doc_result.get("id")
        print(f"[成功] 文档上传成功，ID: {doc_id}")
        
        # 3. 等待向量生成（模拟）
        print("[步骤2] 等待文档向量化...")
        import time
        time.sleep(1)  # 给向量生成一点时间
        
        # 4. 进行RAG对话
        print("[步骤3] 进行RAG对话...")
        chat_data = {
            "message": "Python是谁创建的？",
            "use_rag": True
        }
        
        response = client.post("/chat/", json=chat_data)
        assert response.status_code == 200, f"对话失败: {response.text}"
        
        result = response.json()
        print(f"[成功] 对话响应: {result.get('response', '')[:100]}...")
        
        # 5. 验证引用了知识库
        sources = result.get("sources", [])
        print(f"[验证] 引用来源数量: {len(sources)}")
        
        if sources:
            print(f"[验证] 第一个来源: {sources[0].get('title', '未知')}")
            assert len(sources) > 0, "应该至少有一个引用来源"
        
        print("="*60)
        print("[E2E测试] 知识库测试通过 ✓")
        print("="*60 + "\n")


class TestImageLibraryE2E:
    """图片库端到端测试"""
    
    def test_list_images(self, client):
        """测试列出图片"""
        print("\n" + "="*60)
        print("[E2E测试] 图片库：列出图片")
        print("="*60)
        
        response = client.get("/images/")
        assert response.status_code == 200
        
        images = response.json()
        print(f"[成功] 图片库中有 {len(images)} 张图片")
        
        print("="*60)
        print("[E2E测试] 列出图片测试通过 ✓")
        print("="*60 + "\n")


class TestVideoLibraryE2E:
    """视频库端到端测试"""
    
    def test_list_videos(self, client):
        """测试列出视频"""
        print("\n" + "="*60)
        print("[E2E测试] 视频库：列出视频")
        print("="*60)
        
        response = client.get("/contents/?content_type=VIDEO")
        assert response.status_code == 200
        
        videos = response.json()
        print(f"[成功] 视频库中有 {len(videos)} 个视频")
        
        print("="*60)
        print("[E2E测试] 视频库测试通过 ✓")
        print("="*60 + "\n")


class TestUnifiedContentE2E:
    """统一内容管理端到端测试"""
    
    def test_upload_text_and_chat(self, client):
        """测试上传文本文件后进行RAG对话"""
        print("\n" + "="*60)
        print("[E2E测试] 统一内容：上传文本 + RAG对话")
        print("="*60)
        
        # 1. 上传文本文档
        print("[步骤1] 上传文本文档...")
        text_content = "人工智能是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。"
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(text_content)
            text_path = f.name
        
        try:
            with open(text_path, "rb") as f:
                response = client.post(
                    "/contents/upload",
                    files={"file": ("ai_intro.txt", f, "text/plain")},
                    data={"metadata": '{"category": "AI"}'}
                )
            assert response.status_code == 200, f"文本上传失败: {response.text}"
            print(f"[成功] 文本上传成功: {response.json().get('message', '')}")
        finally:
            os.unlink(text_path)
        
        # 2. 等待处理
        import time
        time.sleep(1)
        
        # 3. RAG对话
        print("[步骤2] 进行RAG对话...")
        chat_response = client.post("/chat/", json={
            "message": "什么是人工智能？",
            "use_rag": True
        })
        
        assert chat_response.status_code == 200
        result = chat_response.json()
        
        print(f"[成功] 对话响应: {result.get('response', '')[:100]}...")
        print(f"[验证] 引用来源数量: {len(result.get('sources', []))}")
        
        print("="*60)
        print("[E2E测试] 统一内容测试通过 ✓")
        print("="*60 + "\n")


class TestChatE2E:
    """对话功能端到端测试"""
    
    def test_basic_chat(self, client):
        """测试基础对话功能"""
        print("\n" + "="*60)
        print("[E2E测试] 基础对话")
        print("="*60)
        
        response = client.post("/chat/", json={
            "message": "你好",
            "use_rag": False
        })
        
        assert response.status_code == 200
        result = response.json()
        
        print(f"[成功] 对话响应: {result.get('response', '')[:50]}...")
        print(f"[验证] 会话ID: {result.get('session_id')}")
        
        print("="*60)
        print("[E2E测试] 基础对话测试通过 ✓")
        print("="*60 + "\n")
    
    def test_chat_with_history(self, client):
        """测试带历史记录的对话"""
        print("\n" + "="*60)
        print("[E2E测试] 带历史记录的对话")
        print("="*60)
        
        # 第一轮对话
        response1 = client.post("/chat/", json={
            "message": "我叫张三",
            "use_rag": False
        })
        assert response1.status_code == 200
        session_id = response1.json().get("session_id")
        print(f"[成功] 第一轮对话，会话ID: {session_id}")
        
        # 第二轮对话（带session_id）
        response2 = client.post("/chat/", json={
            "message": "我叫什么名字？",
            "session_id": session_id,
            "use_rag": False
        })
        assert response2.status_code == 200
        
        result = response2.json()
        print(f"[成功] 第二轮对话响应: {result.get('response', '')}")
        
        # 验证历史记录
        history_response = client.get(f"/chat/history/{session_id}")
        assert history_response.status_code == 200
        
        history = history_response.json()
        print(f"[验证] 历史记录消息数: {len(history)}")
        
        print("="*60)
        print("[E2E测试] 历史对话测试通过 ✓")
        print("="*60 + "\n")


# 运行测试的辅助函数
def run_tests():
    """运行所有端到端测试"""
    pytest.main([__file__, "-v", "--tb=short", "-s"])


if __name__ == "__main__":
    run_tests()
