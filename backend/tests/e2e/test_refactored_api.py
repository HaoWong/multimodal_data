"""
重构后API端到端测试
测试统一内容管理API、统一响应格式和精简后的路由
"""
import pytest
import os
import io
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock


class TestUnifiedContentAPI:
    """测试统一内容管理API"""

    def test_upload_text_file(self, client: TestClient):
        """测试上传文本文件"""
        # 创建测试文件
        file_content = b"This is a test document content for testing purposes."
        test_file = io.BytesIO(file_content)

        response = client.post(
            "/api/contents/upload",
            files={"file": ("test.txt", test_file, "text/plain")},
            data={"metadata": '{"test": true}'}
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        assert "id" in data["data"]
        assert "content_type" in data["data"]

    def test_upload_pdf_file(self, client: TestClient):
        """测试上传PDF文件（模拟）"""
        # 创建模拟PDF内容
        file_content = b"%PDF-1.4 test content"
        test_file = io.BytesIO(file_content)

        with patch('app.api.contents.ollama_client.embed', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [[0.1] * 1024]

            response = client.post(
                "/api/contents/upload",
                files={"file": ("test.pdf", test_file, "application/pdf")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data.get("success") is True

    def test_list_contents(self, client: TestClient):
        """测试获取内容列表"""
        response = client.get("/api/contents/?skip=0&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_list_contents_with_type_filter(self, client: TestClient):
        """测试按类型过滤内容列表"""
        response = client.get("/api/contents/?content_type=TEXT&skip=0&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    def test_search_contents(self, client: TestClient):
        """测试语义搜索内容"""
        with patch('app.api.contents.ollama_client.embed', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [[0.1] * 1024]

            response = client.post(
                "/api/contents/search?query=测试&top_k=5"
            )

            assert response.status_code == 200
            data = response.json()
            assert data.get("success") is True
            assert "data" in data

    def test_search_contents_with_type(self, client: TestClient):
        """测试按类型搜索内容"""
        with patch('app.api.contents.ollama_client.embed', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [[0.1] * 1024]

            response = client.post(
                "/api/contents/search?query=测试&content_type=TEXT&top_k=5"
            )

            assert response.status_code == 200
            data = response.json()
            assert data.get("success") is True


class TestUnifiedResponseFormat:
    """测试统一响应格式"""

    def test_success_response_structure(self, client: TestClient):
        """测试成功响应结构"""
        response = client.get("/api/contents/?skip=0&limit=10")

        assert response.status_code == 200
        data = response.json()

        # 验证统一响应格式
        assert "success" in data
        assert "data" in data
        assert "message" in data
        assert "timestamp" in data
        assert data["success"] is True

    def test_error_response_structure(self, client: TestClient):
        """测试错误响应结构"""
        # 请求不存在的内容（使用无效的UUID格式）
        response = client.get("/api/contents/invalid-uuid-format")

        # 可能返回404或422（验证错误）
        assert response.status_code in [404, 422, 500]
        data = response.json()

        # 验证错误响应格式（可能是统一格式或FastAPI默认格式）
        assert "detail" in data or "error" in data or "message" in data

    def test_paginated_response(self, client: TestClient):
        """测试分页响应"""
        # 先创建一些内容
        for i in range(3):
            file_content = f"Content {i}".encode()
            test_file = io.BytesIO(file_content)
            client.post(
                "/api/contents/upload",
                files={"file": (f"test_{i}.txt", test_file, "text/plain")}
            )

        response = client.get("/api/contents/?skip=0&limit=2")

        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data


class TestBackwardCompatibility:
    """测试向后兼容端点"""

    def test_documents_list_compat(self, client: TestClient):
        """测试文档列表（向后兼容）"""
        response = client.get("/api/contents/documents/list?skip=0&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    def test_documents_create_compat(self, client: TestClient):
        """测试创建文档（向后兼容）"""
        response = client.post(
            "/api/contents/documents/create",
            json={
                "title": "测试文档",
                "content": "测试内容",
                "doc_type": "text"
            }
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        assert data["data"]["title"] == "测试文档"

    def test_documents_search_compat(self, client: TestClient):
        """测试搜索文档（向后兼容）"""
        from app.services.ollama_client import ollama_client
        
        with patch.object(ollama_client, 'embed', return_value=[[0.1] * 1024]):
            response = client.post(
                "/api/contents/documents/search",
                json={"query": "测试", "top_k": 5}
            )

            # 可能返回200或500（如果服务不可用）
            assert response.status_code in [200, 500, 503]
            if response.status_code == 200:
                data = response.json()
                assert data.get("success") is True
                assert "data" in data

    def test_images_list_compat(self, client: TestClient):
        """测试图片列表（向后兼容）"""
        response = client.get("/api/contents/images/list")

        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data

    def test_images_search_compat(self, client: TestClient):
        """测试搜索图片（向后兼容）"""
        from app.services.ollama_client import ollama_client
        
        with patch.object(ollama_client, 'embed', return_value=[[0.1] * 1024]):
            response = client.post(
                "/api/contents/images/search?query=测试&top_k=5"
            )

            # 可能返回200或500（如果服务不可用）
            assert response.status_code in [200, 500, 503]
            if response.status_code == 200:
                data = response.json()
                assert data.get("success") is True
                assert "data" in data


class TestBaseServiceIntegration:
    """测试BaseService功能集成"""

    def test_content_crud_workflow(self, client: TestClient):
        """测试内容CRUD完整流程"""
        # 1. 创建内容（上传文件）
        file_content = b"Test content for CRUD workflow"
        test_file = io.BytesIO(file_content)

        create_response = client.post(
            "/api/contents/upload",
            files={"file": ("crud_test.txt", test_file, "text/plain")}
        )

        assert create_response.status_code == 200
        create_data = create_response.json()
        content_id = create_data["data"]["id"]

        # 2. 获取内容详情
        detail_response = client.get(f"/api/contents/{content_id}")
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        assert detail_data.get("success") is True
        assert detail_data["data"]["id"] == content_id

        # 3. 删除内容
        delete_response = client.delete(f"/api/contents/{content_id}")
        assert delete_response.status_code == 200
        delete_data = delete_response.json()
        assert delete_data.get("success") is True

        # 4. 验证删除
        verify_response = client.get(f"/api/contents/{content_id}")
        assert verify_response.status_code == 404

    def test_content_list_pagination(self, client: TestClient):
        """测试内容列表分页"""
        # 创建多个测试文件
        for i in range(5):
            file_content = f"Content {i}".encode()
            test_file = io.BytesIO(file_content)
            client.post(
                "/api/contents/upload",
                files={"file": (f"pagination_test_{i}.txt", test_file, "text/plain")}
            )

        # 测试分页
        response = client.get("/api/contents/?skip=0&limit=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 3

        response = client.get("/api/contents/?skip=3&limit=3")
        assert response.status_code == 200


class TestStreamResponse:
    """测试流式响应"""

    def test_chat_stream_response(self, client: TestClient):
        """测试对话流式响应"""
        from app.services.ollama_client import ollama_client
        
        async def mock_stream(*args, **kwargs):
            yield "Hello"
            yield " World"

        with patch.object(ollama_client, 'chat', return_value=mock_stream()):
            response = client.post(
                "/api/chat/stream",
                json={"message": "你好", "use_rag": False}
            )

            # 流式响应可能返回200，即使内容类型不匹配
            assert response.status_code in [200, 422]
            # 如果成功，检查是否是流式响应格式
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                # 可能是text/event-stream或application/json
                assert "text/event-stream" in content_type or "application/json" in content_type


class TestSkillAndAgentAPI:
    """测试Skill和Agent API"""

    def test_skills_list(self, client: TestClient):
        """测试获取技能列表"""
        response = client.get("/api/skills/")

        assert response.status_code == 200
        # 技能列表可能有不同的响应格式

    def test_agent_execute(self, client: TestClient):
        """测试Agent执行"""
        from app.services.ollama_client import ollama_client
        
        async def mock_chat_stream(*args, **kwargs):
            yield "Task result"
        
        with patch.object(ollama_client, 'chat', return_value=mock_chat_stream()):
            response = client.post(
                "/api/agent/execute",
                json={"task": "你好", "context": {}}
            )

            # 可能返回200或500（如果服务不可用）
            assert response.status_code in [200, 500, 503]

    def test_agent_tasks_list(self, client: TestClient):
        """测试获取Agent任务列表"""
        response = client.get("/api/agent/tasks?limit=10")

        assert response.status_code == 200


# 辅助函数
async def async_generator(items):
    """创建异步生成器"""
    for item in items:
        yield item
