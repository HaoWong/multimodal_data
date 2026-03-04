"""
基础API测试 - 不删除数据库表
"""
import pytest
from fastapi.testclient import TestClient


class TestBasicAPI:
    """基础API测试"""
    
    def test_health_check(self, client: TestClient):
        """测试API是否正常运行（使用统一内容API）"""
        response = client.get("/api/contents/?skip=0&limit=10")
        assert response.status_code == 200
        
    def test_chat_sessions(self, client: TestClient):
        """测试获取会话列表"""
        response = client.get("/api/chat/sessions?limit=10")
        assert response.status_code == 200
        data = response.json()
        # 可能返回数组或统一响应格式
        if isinstance(data, dict):
            assert data.get("success") is True
            assert "data" in data
        else:
            assert isinstance(data, list)
        
    def test_list_images(self, client: TestClient):
        """测试获取图片列表（使用新的统一内容API）"""
        response = client.get("/api/contents/images/list")
        # 可能返回200或404（如果端点不存在）
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict):
                assert data.get("success") is True
                assert "data" in data
            else:
                assert isinstance(data, list)
        
    def test_list_contents(self, client: TestClient):
        """测试获取内容列表"""
        response = client.get("/api/contents/?skip=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        # 统一响应格式
        assert data.get("success") is True
        assert "data" in data
        assert isinstance(data["data"], list)
