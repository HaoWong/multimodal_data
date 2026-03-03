#!/usr/bin/env python3
"""
测试中文响应 - 确保没有转义字符
"""
import pytest
from fastapi.testclient import TestClient


class TestUnicodeResponse:
    """测试中文响应"""

    def test_chat_response_chinese(self, client: TestClient):
        """测试聊天响应中的中文字符"""
        response = client.post('/api/chat/', json={'message': '测试', 'use_rag': False})
        assert response.status_code == 200
        
        # 检查响应中是否有转义的Unicode字符
        response_text = response.text
        assert '\\u' not in response_text, f"响应中包含转义字符: {response_text[:200]}"
        
        # 检查中文是否正确显示
        assert '测试' in response_text or '你好' in response_text or '问题' in response_text

    def test_documents_list_chinese(self, client: TestClient):
        """测试文档列表响应"""
        response = client.get('/api/documents/?skip=0&limit=10')
        assert response.status_code == 200
        
        # 检查是否有转义字符
        response_text = response.text
        assert '\\u' not in response_text, f"响应中包含转义字符: {response_text[:200]}"

    def test_images_list_chinese(self, client: TestClient):
        """测试图片列表响应"""
        response = client.get('/api/images/')
        assert response.status_code == 200
        
        # 检查是否有转义字符
        response_text = response.text
        assert '\\u' not in response_text, f"响应中包含转义字符: {response_text[:200]}"

    def test_contents_list_chinese(self, client: TestClient):
        """测试内容列表响应"""
        response = client.get('/api/contents/?skip=0&limit=10')
        assert response.status_code == 200
        
        # 检查是否有转义字符
        response_text = response.text
        assert '\\u' not in response_text, f"响应中包含转义字符: {response_text[:200]}"

    def test_chat_sessions_chinese(self, client: TestClient):
        """测试会话列表响应"""
        response = client.get('/api/chat/sessions?limit=10')
        assert response.status_code == 200
        
        # 检查是否有转义字符
        response_text = response.text
        assert '\\u' not in response_text, f"响应中包含转义字符: {response_text[:200]}"

    def test_agent_tasks_chinese(self, client: TestClient):
        """测试Agent任务列表响应"""
        response = client.get('/api/agent/tasks?limit=10')
        assert response.status_code == 200
        
        # 检查是否有转义字符
        response_text = response.text
        assert '\\u' not in response_text, f"响应中包含转义字符: {response_text[:200]}"
