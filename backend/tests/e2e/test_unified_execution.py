"""
统一任务执行引擎端到端测试
测试统一任务执行引擎、Skill执行、Agent执行和结果格式一致性
"""
import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.core.task_engine import (
    TaskExecutionEngine,
    TaskContext,
    TaskResult,
    TaskStatus,
    ExecutionConfig,
    create_task_context,
    create_execution_config,
)
from app.agent.engine import AgentEngine, AgentStep, AgentTask
from app.skills import SkillResult


class TestTaskExecutionEngine:
    """测试统一任务执行引擎"""

    @pytest.fixture
    def engine(self):
        """创建任务执行引擎实例"""
        return TaskExecutionEngine()

    @pytest.fixture
    def sample_context(self):
        """创建示例任务上下文"""
        return create_task_context(
            task_name="test_task",
            task_type="skill",
            params={"key": "value"}
        )

    @pytest.mark.asyncio
    async def test_execute_sync_function(self, engine, sample_context):
        """测试执行同步函数"""
        def sync_func(x, y):
            return x + y

        config = create_execution_config(timeout=10)
        result = await engine.execute(sync_func, sample_context, config, 1, 2)

        assert isinstance(result, TaskResult)
        assert result.success is True
        assert result.data == 3
        assert result.status == TaskStatus.COMPLETED
        assert result.execution_time > 0

    @pytest.mark.asyncio
    async def test_execute_async_function(self, engine, sample_context):
        """测试执行异步函数"""
        async def async_func(x, y):
            await asyncio.sleep(0.01)
            return x * y

        config = create_execution_config(timeout=10)
        result = await engine.execute(async_func, sample_context, config, 3, 4)

        assert isinstance(result, TaskResult)
        assert result.success is True
        assert result.data == 12
        assert result.status == TaskStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_execute_with_timeout_success(self, engine, sample_context):
        """测试带超时的成功执行"""
        async def quick_func():
            await asyncio.sleep(0.01)
            return "done"

        config = create_execution_config(timeout=5)
        result = await engine.execute(quick_func, sample_context, config)

        assert result.success is True
        assert result.data == "done"

    @pytest.mark.asyncio
    async def test_execute_with_timeout_failure(self, engine, sample_context):
        """测试带超时的失败执行"""
        async def slow_func():
            await asyncio.sleep(10)
            return "done"

        config = create_execution_config(timeout=0.1)
        result = await engine.execute(slow_func, sample_context, config)

        assert result.success is False
        assert result.status == TaskStatus.FAILED
        assert "超时" in result.error or "timeout" in result.error.lower()

    @pytest.mark.asyncio
    async def test_execute_with_retry_success(self, engine, sample_context):
        """测试带重试的成功执行"""
        call_count = 0

        def flaky_func():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary error")
            return "success"

        config = create_execution_config(max_retries=3, retry_delay=0.01)
        result = await engine.execute(flaky_func, sample_context, config)

        assert result.success is True
        assert result.data == "success"
        assert result.retry_count == 2

    @pytest.mark.asyncio
    async def test_execute_with_retry_exhausted(self, engine, sample_context):
        """测试重试次数耗尽"""
        def always_fail():
            raise ValueError("Persistent error")

        config = create_execution_config(max_retries=2, retry_delay=0.01)
        result = await engine.execute(always_fail, sample_context, config)

        assert result.success is False
        assert result.retry_count == 2
        assert "Persistent error" in result.error

    @pytest.mark.asyncio
    async def test_execute_returns_task_result(self, engine, sample_context):
        """测试函数返回TaskResult的情况"""
        def func_returning_result():
            return TaskResult.success_result(data="custom", metadata={"key": "value"})

        config = create_execution_config()
        result = await engine.execute(func_returning_result, sample_context, config)

        assert result.success is True
        assert result.data == "custom"
        assert result.metadata.get("key") == "value"

    @pytest.mark.asyncio
    async def test_execute_with_hooks(self, engine, sample_context):
        """测试前置和后置钩子"""
        pre_hook_called = False
        post_hook_called = False

        async def pre_hook(ctx):
            nonlocal pre_hook_called
            pre_hook_called = True

        async def post_hook(ctx, result):
            nonlocal post_hook_called
            post_hook_called = True

        engine.register_pre_hook(pre_hook)
        engine.register_post_hook(post_hook)

        def simple_func():
            return "result"

        config = create_execution_config()
        result = await engine.execute(simple_func, sample_context, config)

        assert pre_hook_called is True
        assert post_hook_called is True
        assert result.success is True

    @pytest.mark.asyncio
    async def test_execute_stream(self, engine, sample_context):
        """测试流式执行"""
        async def stream_generator():
            yield "chunk1"
            yield "chunk2"
            yield "chunk3"

        config = create_execution_config()
        chunks = []
        async for chunk in engine.execute_stream(stream_generator, sample_context, config):
            chunks.append(chunk)

        assert chunks == ["chunk1", "chunk2", "chunk3"]


class TestTaskResult:
    """测试任务结果类"""

    def test_success_result_creation(self):
        """测试创建成功结果"""
        result = TaskResult.success_result(
            data={"key": "value"},
            execution_time=1.5,
            metadata={"source": "test"}
        )

        assert result.success is True
        assert result.data == {"key": "value"}
        assert result.execution_time == 1.5
        assert result.metadata["source"] == "test"
        assert result.status == TaskStatus.COMPLETED

    def test_error_result_creation(self):
        """测试创建错误结果"""
        result = TaskResult.error_result(
            error="Something went wrong",
            error_type="TestError",
            execution_time=2.0,
            retry_count=3
        )

        assert result.success is False
        assert result.error == "Something went wrong"
        assert result.error_type == "TestError"
        assert result.execution_time == 2.0
        assert result.retry_count == 3
        assert result.status == TaskStatus.FAILED

    def test_timeout_result_creation(self):
        """测试创建超时结果"""
        result = TaskResult.timeout_result(timeout_seconds=30)

        assert result.success is False
        assert "超时" in result.error or "timeout" in result.error.lower()
        assert result.error_type == "TimeoutError"
        assert result.execution_time == 30
        assert result.status == TaskStatus.TIMEOUT

    def test_to_dict_serialization(self):
        """测试结果字典序列化"""
        result = TaskResult.success_result(
            data={"key": "value"},
            execution_time=1.0
        )

        data = result.to_dict()

        assert data["success"] is True
        assert data["data"] == {"key": "value"}
        assert data["execution_time"] == 1.0
        assert data["status"] == "completed"
        assert "timestamp" in data


class TestSkillExecution:
    """测试Skill执行"""

    @pytest.mark.asyncio
    async def test_skill_execution_through_engine(self):
        """测试通过引擎执行Skill"""
        engine = TaskExecutionEngine()

        # 创建模拟Skill
        async def mock_skill_execute(query: str, **kwargs):
            return f"Result for: {query}"

        context = create_task_context(
            task_name="vector_search",
            task_type="skill",
            params={"query": "test"}
        )

        config = create_execution_config(timeout=10)
        result = await engine.execute(mock_skill_execute, context, config, query="test")

        assert result.success is True
        assert "test" in result.data

    @pytest.mark.asyncio
    async def test_skill_with_validation(self):
        """测试带参数验证的Skill"""
        engine = TaskExecutionEngine()

        def validate_params(params):
            if "query" not in params:
                return False, "Missing required parameter: query"
            return True, None

        engine.register_validator("skill", validate_params)

        async def skill_func(query: str):
            return f"Search: {query}"

        # 测试无效参数
        context_invalid = create_task_context(
            task_name="test_skill",
            task_type="skill",
            params={}  # 缺少query
        )

        config = create_execution_config(validate_params=True)
        result = await engine.execute(skill_func, context_invalid, config)

        assert result.success is False
        assert "Missing required parameter" in result.error

        # 测试有效参数
        context_valid = create_task_context(
            task_name="test_skill",
            task_type="skill",
            params={"query": "test"}
        )

        result = await engine.execute(skill_func, context_valid, config, query="test")
        assert result.success is True


class TestAgentExecution:
    """测试Agent执行"""

    @pytest.fixture
    def agent_engine(self):
        """创建Agent引擎实例"""
        return AgentEngine()

    @pytest.mark.asyncio
    async def test_agent_task_creation(self, agent_engine):
        """测试Agent任务创建"""
        task = AgentTask(
            task_id="test-123",
            description="Test task",
            context={"key": "value"}
        )

        assert task.task_id == "test-123"
        assert task.description == "Test task"
        assert task.context["key"] == "value"
        assert task.status == "pending"
        assert len(task.steps) == 0

    @pytest.mark.asyncio
    async def test_agent_step_creation(self):
        """测试Agent步骤创建"""
        step = AgentStep(
            step_number=1,
            skill_name="llm_chat",
            params={"message": "Hello"},
            reasoning="Test reasoning"
        )

        assert step.step_number == 1
        assert step.skill_name == "llm_chat"
        assert step.params["message"] == "Hello"
        assert step.reasoning == "Test reasoning"
        assert step.status == "pending"

    @pytest.mark.asyncio
    async def test_agent_step_to_dict(self):
        """测试Agent步骤序列化"""
        step = AgentStep(
            step_number=1,
            skill_name="test_skill",
            params={"key": "value"},
            reasoning="Test",
            status="completed"
        )

        data = step.to_dict()

        assert data["step_number"] == 1
        assert data["skill_name"] == "test_skill"
        assert data["params"]["key"] == "value"
        assert data["reasoning"] == "Test"
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_agent_task_to_dict(self, agent_engine):
        """测试Agent任务序列化"""
        task = AgentTask(
            task_id="test-456",
            description="Test description",
            context={},
            steps=[],
            final_result="Final result",
            status="completed"
        )

        data = task.to_dict()

        assert data["task_id"] == "test-456"
        assert data["description"] == "Test description"
        assert data["final_result"] == "Final result"
        assert data["status"] == "completed"
        assert "created_at" in data


class TestExecutionResultFormatConsistency:
    """测试执行结果格式一致性"""

    def test_all_results_have_required_fields(self):
        """测试所有结果都有必需字段"""
        # 成功结果
        success_result = TaskResult.success_result(data="test")
        success_dict = success_result.to_dict()

        required_fields = ["success", "data", "error", "error_type", "execution_time", "retry_count", "status", "metadata", "timestamp"]
        for field in required_fields:
            assert field in success_dict, f"Missing field: {field}"

        # 错误结果
        error_result = TaskResult.error_result(error="test error")
        error_dict = error_result.to_dict()

        for field in required_fields:
            assert field in error_dict, f"Missing field in error result: {field}"

    def test_result_status_values(self):
        """测试结果状态值一致性"""
        success = TaskResult.success_result()
        error = TaskResult.error_result(error="test")
        timeout = TaskResult.timeout_result(30)

        assert success.status == TaskStatus.COMPLETED
        assert error.status == TaskStatus.FAILED
        assert timeout.status == TaskStatus.TIMEOUT

        # 验证字符串值
        assert success.to_dict()["status"] == "completed"
        assert error.to_dict()["status"] == "failed"
        assert timeout.to_dict()["status"] == "timeout"

    def test_success_flag_consistency(self):
        """测试成功标志一致性"""
        success = TaskResult.success_result()
        error = TaskResult.error_result(error="test")
        timeout = TaskResult.timeout_result(30)

        assert success.success is True
        assert success.to_dict()["success"] is True

        assert error.success is False
        assert error.to_dict()["success"] is False

        assert timeout.success is False
        assert timeout.to_dict()["success"] is False


class TestExecutionConfig:
    """测试执行配置"""

    def test_default_config(self):
        """测试默认配置"""
        config = ExecutionConfig()

        assert config.timeout is None
        assert config.max_retries == 0
        assert config.retry_delay == 1.0
        assert config.retry_backoff == 2.0
        assert config.validate_params is True
        assert config.log_execution is True

    def test_custom_config(self):
        """测试自定义配置"""
        config = ExecutionConfig(
            timeout=30,
            max_retries=3,
            retry_delay=0.5,
            retry_backoff=1.5,
            validate_params=False
        )

        assert config.timeout == 30
        assert config.max_retries == 3
        assert config.retry_delay == 0.5
        assert config.retry_backoff == 1.5
        assert config.validate_params is False

    def test_should_retry_logic(self):
        """测试重试判断逻辑"""
        config = ExecutionConfig(max_retries=3, retry_exceptions=(ValueError,))

        # 应该重试的情况
        assert config.should_retry(0, ValueError("test")) is True
        assert config.should_retry(1, ValueError("test")) is True
        assert config.should_retry(2, ValueError("test")) is True

        # 不应该重试的情况
        assert config.should_retry(3, ValueError("test")) is False  # 超过最大重试次数
        assert config.should_retry(0, TypeError("test")) is False  # 不在重试异常列表中

    def test_retry_delay_calculation(self):
        """测试重试延迟计算"""
        config = ExecutionConfig(retry_delay=1.0, retry_backoff=2.0)

        assert config.get_retry_delay(0) == 1.0
        assert config.get_retry_delay(1) == 2.0
        assert config.get_retry_delay(2) == 4.0
        assert config.get_retry_delay(3) == 8.0


class TestTaskContext:
    """测试任务上下文"""

    def test_context_creation(self):
        """测试上下文创建"""
        context = TaskContext(
            task_id="test-123",
            task_name="test_task",
            task_type="skill",
            params={"key": "value"},
            user_id="user-1",
            session_id="session-1"
        )

        assert context.task_id == "test-123"
        assert context.task_name == "test_task"
        assert context.task_type == "skill"
        assert context.params["key"] == "value"
        assert context.user_id == "user-1"
        assert context.session_id == "session-1"

    def test_shared_data_operations(self):
        """测试共享数据操作"""
        context = TaskContext()

        # 设置共享数据
        context.set_shared("key1", "value1")
        context.set_shared("key2", {"nested": "data"})

        # 获取共享数据
        assert context.get_shared("key1") == "value1"
        assert context.get_shared("key2") == {"nested": "data"}
        assert context.get_shared("nonexistent") is None
        assert context.get_shared("nonexistent", "default") == "default"

    def test_execution_record_tracking(self):
        """测试执行记录跟踪"""
        context = TaskContext()

        context.add_execution_record({"action": "step1", "result": "success"})
        context.add_execution_record({"action": "step2", "result": "success"})

        assert len(context.execution_history) == 2
        assert context.execution_history[0]["action"] == "step1"
        assert context.execution_history[1]["action"] == "step2"
        assert "timestamp" in context.execution_history[0]

    def test_context_to_dict(self):
        """测试上下文序列化"""
        context = TaskContext(
            task_id="test-123",
            task_name="test_task",
            params={"key": "value"}
        )

        data = context.to_dict()

        assert data["task_id"] == "test-123"
        assert data["task_name"] == "test_task"
        assert data["params"]["key"] == "value"
        assert "created_at" in data


class TestIntegrationWithAPI:
    """测试与API集成的端到端场景"""

    def test_task_execution_api_endpoint(self, client: TestClient):
        """测试任务执行API端点"""
        # 获取任务列表
        response = client.get("/api/tasks/?limit=10")

        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data

    def test_running_tasks_api_endpoint(self, client: TestClient):
        """测试运行中任务API端点"""
        response = client.get("/api/tasks/running")

        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data

