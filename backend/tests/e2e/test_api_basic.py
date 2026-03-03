"""
基础API测试 - 不删除数据库表
"""
import pytest
from fastapi.testclient import TestClient


class TestBasicAPI:
    """基础API测试"""
    
    def test_health_check(self, client: TestClient):
        """测试API是否正常运行"""
        response = client.get("/api/documents/?skip=0&limit=10")
        assert response.status_code == 200
        
    def test_chat_sessions(self, client: TestClient):
        """测试获取会话列表"""
        response = client.get("/api/chat/sessions?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_list_images(self, client: TestClient):
        """测试获取图片列表"""
        response = client.get("/api/images/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_list_contents(self, client: TestClient):
        """测试获取内容列表"""
        response = client.get("/api/contents/?skip=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
