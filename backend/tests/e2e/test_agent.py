"""
Agent API 端到端测试
"""
import pytest
from fastapi.testclient import TestClient


class TestAgentE2E:
    """Agent 端到端测试"""

    def test_agent_execute(self, client: TestClient):
        """测试 Agent 非流式执行"""
        print("\n🧪 测试 /api/agent/execute")
        
        response = client.post("/api/agent/execute", json={
            "task": "你好",
            "context": {}
        })
        
        assert response.status_code == 200, f"执行失败: {response.text}"
        
        result = response.json()
        assert "task_id" in result
        assert "status" in result
        assert "output" in result
        
        print(f"   ✅ 任务ID: {result['task_id']}")
        print(f"   ✅ 状态: {result['status']}")

    def test_agent_execute_stream(self, client: TestClient):
        """测试 Agent 流式执行"""
        print("\n🧪 测试 /api/agent/execute/stream")
        
        response = client.post("/api/agent/execute/stream", json={
            "task": "你好",
            "context": {}
        })
        
        assert response.status_code == 200, f"执行失败: {response.text}"
        
        # 读取流式响应
        chunks = []
        for chunk in response.iter_text():
            if chunk:
                chunks.append(chunk)
        
        assert len(chunks) > 0, "流式响应为空"
        print(f"   ✅ 收到 {len(chunks)} 个流式块")

    def test_agent_with_rag(self, client: TestClient):
        """测试 Agent 带 RAG 检索"""
        print("\n🧪 测试 Agent 带 RAG")
        
        response = client.post("/api/agent/execute", json={
            "task": "搜索关于人工智能的内容",
            "context": {"use_rag": True}
        })
        
        assert response.status_code == 200, f"执行失败: {response.text}"
        
        result = response.json()
        assert result["status"] in ["completed", "failed"]
        print(f"   ✅ 状态: {result['status']}")
