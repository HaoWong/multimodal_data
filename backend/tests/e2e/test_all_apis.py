"""
所有API端点测试 - 验证前后端接口匹配
测试精简后的API路由结构
"""
import pytest
from fastapi.testclient import TestClient


class TestAllAPIs:
    """测试所有API端点"""

    # ==================== Contents API (统一内容管理) ====================
    def test_contents_list(self, client: TestClient):
        """测试获取内容列表"""
        response = client.get("/api/contents/?skip=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    def test_contents_search(self, client: TestClient):
        """测试搜索内容"""
        response = client.post("/api/contents/search?query=测试&top_k=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    # ==================== Contents/Documents API (向后兼容) ====================
    def test_documents_list_compat(self, client: TestClient):
        """测试获取文档列表（向后兼容端点）"""
        response = client.get("/api/contents/documents/list?skip=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    def test_documents_create_compat(self, client: TestClient):
        """测试创建文档（向后兼容端点）"""
        response = client.post("/api/contents/documents/create", json={
            "title": "测试文档",
            "content": "测试内容",
            "doc_type": "text"
        })
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("success") is True

    def test_documents_search_compat(self, client: TestClient):
        """测试搜索文档（向后兼容端点）"""
        response = client.post("/api/contents/documents/search", json={
            "query": "测试",
            "top_k": 5
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    # ==================== Contents/Images API (向后兼容) ====================
    def test_images_list_compat(self, client: TestClient):
        """测试获取图片列表（向后兼容端点）"""
        response = client.get("/api/contents/images/list")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    def test_images_search_compat(self, client: TestClient):
        """测试搜索图片（向后兼容端点）"""
        response = client.post("/api/contents/images/search?query=测试&top_k=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

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
        data = response.json()
        # 现在返回统一响应格式 {success, data, message}
        assert isinstance(data, dict)
        assert data.get("success") is True
        assert "data" in data
        assert isinstance(data["data"], list)

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

    # ==================== Tasks API ====================
    def test_tasks_list(self, client: TestClient):
        """测试获取任务列表"""
        response = client.get("/api/tasks/?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data

    def test_tasks_running(self, client: TestClient):
        """测试获取运行中的任务"""
        response = client.get("/api/tasks/running")
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data

    # ==================== 根路径和Health ====================
    def test_root_endpoint(self, client: TestClient):
        """测试根路径"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "migration_notice" in data

    def test_health_endpoint(self, client: TestClient):
        """测试健康检查"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
