"""
所有API端点测试 - 验证前后端接口匹配
"""
import pytest
from fastapi.testclient import TestClient


class TestAllAPIs:
    """测试所有API端点"""

    # ==================== Documents API ====================
    def test_documents_list(self, client: TestClient):
        """测试获取文档列表"""
        response = client.get("/api/documents/?skip=0&limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_documents_create(self, client: TestClient):
        """测试创建文档"""
        response = client.post("/api/documents/", json={
            "title": "测试文档",
            "content": "测试内容",
            "doc_type": "text"
        })
        assert response.status_code in [200, 201]

    def test_documents_search(self, client: TestClient):
        """测试搜索文档"""
        response = client.post("/api/documents/search", json={
            "query": "测试",
            "top_k": 5
        })
        assert response.status_code == 200

    # ==================== Chat API ====================
    def test_chat_send(self, client: TestClient):
        """测试发送消息"""
        response = client.post("/api/chat/", json={
            "message": "你好",
            "use_rag": False
        })
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data

    def test_chat_sessions(self, client: TestClient):
        """测试获取会话列表"""
        response = client.get("/api/chat/sessions?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # ==================== Images API ====================
    def test_images_list(self, client: TestClient):
        """测试获取图片列表"""
        response = client.get("/api/images/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_images_search(self, client: TestClient):
        """测试搜索图片"""
        response = client.post("/api/images/search?query=测试&top_k=5")
        assert response.status_code == 200

    # ==================== Contents API ====================
    def test_contents_list(self, client: TestClient):
        """测试获取内容列表"""
        response = client.get("/api/contents/?skip=0&limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_contents_search(self, client: TestClient):
        """测试搜索内容"""
        response = client.post("/api/contents/search?query=测试&top_k=5")
        assert response.status_code == 200

    # ==================== Skills API ====================
    def test_skills_list(self, client: TestClient):
        """测试获取技能列表"""
        response = client.get("/api/skills/")
        assert response.status_code == 200

    # ==================== Agent API ====================
    def test_agent_execute(self, client: TestClient):
        """测试Agent执行"""
        response = client.post("/api/agent/execute", json={
            "task": "你好",
            "context": {}
        })
        assert response.status_code == 200

    def test_agent_tasks(self, client: TestClient):
        """测试获取Agent任务列表"""
        response = client.get("/api/agent/tasks?limit=10")
        assert response.status_code == 200
