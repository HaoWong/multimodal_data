"""
BaseService 单元测试
测试通用CRUD操作、向量搜索和错误处理
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.base_service import (
    BaseService, ServiceResponse, ServiceError, NotFoundError, ValidationError
)
from app.models.content_models import Content, ContentType


class MockContentService(BaseService[Content]):
    """模拟Content服务用于测试"""
    model_class = Content


class TestBaseService:
    """测试BaseService基类"""

    @pytest.fixture
    def mock_db(self):
        """创建mock数据库会话"""
        db = Mock(spec=Session)
        return db

    @pytest.fixture
    def base_service(self, mock_db):
        """创建BaseService实例"""
        return MockContentService(mock_db)

    @pytest.fixture
    def sample_content(self):
        """示例内容数据"""
        return Content(
            id=uuid4(),
            content_type=ContentType.TEXT,
            source_path="uploads/test.txt",
            original_name="test.txt",
            file_size=100,
            mime_type="text/plain",
            extracted_text="测试内容",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

    class TestCRUDOperations:
        """测试CRUD操作"""

        def test_get_by_id_success(self, base_service, mock_db, sample_content):
            """测试成功获取记录"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = sample_content

            # Act
            result = base_service.get_by_id(sample_content.id)

            # Assert
            assert result == sample_content

        def test_get_by_id_not_found(self, base_service, mock_db):
            """测试获取不存在的记录"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # Act
            result = base_service.get_by_id(uuid4())

            # Assert
            assert result is None

        def test_get_or_404_success(self, base_service, mock_db, sample_content):
            """测试成功获取记录或抛出404"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = sample_content

            # Act
            result = base_service.get_or_404(sample_content.id)

            # Assert
            assert result == sample_content

        def test_get_or_404_not_found(self, base_service, mock_db):
            """测试获取不存在的记录时抛出404"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # Act & Assert
            with pytest.raises(NotFoundError) as exc_info:
                base_service.get_or_404(uuid4())
            
            assert "not found" in str(exc_info.value)

        def test_list_with_pagination(self, base_service, mock_db, sample_content):
            """测试分页列表查询"""
            # Arrange
            mock_query = Mock()
            mock_query.offset.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.all.return_value = [sample_content]
            mock_query.count.return_value = 1
            mock_db.query.return_value = mock_query

            # Act
            response = base_service.list(skip=0, limit=10)

            # Assert
            assert response.success is True
            assert len(response.data) == 1
            assert response.data[0] == sample_content
            assert response.meta["total"] == 1

        def test_create_success(self, base_service, mock_db):
            """测试成功创建记录"""
            # Arrange
            obj_data = {
                "content_type": ContentType.TEXT,
                "source_path": "uploads/test.txt",
                "original_name": "test.txt"
            }

            # Act
            result = base_service.create(obj_data)

            # Assert
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once()

        def test_update_success(self, base_service, mock_db, sample_content):
            """测试成功更新记录"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = sample_content
            update_data = {"extracted_text": "更新后的内容"}

            # Act
            response = base_service.update(sample_content.id, update_data)

            # Assert
            assert response.success is True
            assert response.data.extracted_text == "更新后的内容"
            mock_db.commit.assert_called_once()

        def test_update_not_found(self, base_service, mock_db):
            """测试更新不存在的记录"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # Act & Assert
            with pytest.raises(NotFoundError):
                base_service.update(uuid4(), {"extracted_text": "内容"})

        def test_delete_success(self, base_service, mock_db, sample_content):
            """测试成功删除记录"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = sample_content

            # Act
            base_service.delete(sample_content.id)

            # Assert
            mock_db.delete.assert_called_once_with(sample_content)
            mock_db.commit.assert_called_once()

        def test_delete_not_found(self, base_service, mock_db):
            """测试删除不存在的记录"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # Act & Assert
            with pytest.raises(NotFoundError):
                base_service.delete(uuid4())

    class TestErrorHandling:
        """测试错误处理"""

        def test_service_error(self):
            """测试ServiceError异常"""
            error = ServiceError("测试错误", code="TEST_ERROR")
            assert str(error) == "测试错误"
            assert error.code == "TEST_ERROR"

        def test_not_found_error(self):
            """测试NotFoundError异常"""
            error = NotFoundError("Content", "123")
            assert "Content" in str(error)
            assert "123" in str(error)
            assert error.code == "NOT_FOUND"

        def test_validation_error(self):
            """测试ValidationError异常"""
            error = ValidationError("字段验证失败", field="name")
            assert "字段验证失败" in str(error)
            assert error.code == "VALIDATION_ERROR"

        def test_service_response_ok(self):
            """测试成功的服务响应"""
            response = ServiceResponse.ok(data={"id": 1}, message="操作成功")
            assert response.success is True
            assert response.data == {"id": 1}
            assert response.message == "操作成功"

        def test_service_response_error(self):
            """测试错误的服务响应"""
            response = ServiceResponse.error(
                message="操作失败",
                code="OPERATION_ERROR",
                details={"field": "name"}
            )
            assert response.success is False
            assert response.message == "操作失败"
            assert response.error_code == "OPERATION_ERROR"

        def test_service_response_from_exception(self):
            """测试从异常创建响应"""
            error = ServiceError("测试错误", code="TEST_ERROR")
            response = ServiceResponse.from_exception(error)
            assert response.success is False
            assert response.message == "测试错误"
            assert response.error_code == "TEST_ERROR"

    class TestBulkOperations:
        """测试批量操作"""

        def test_bulk_create(self, base_service, mock_db):
            """测试批量创建"""
            # Arrange
            items = [
                {"content_type": ContentType.TEXT, "source_path": "test1.txt", "original_name": "test1.txt"},
                {"content_type": ContentType.TEXT, "source_path": "test2.txt", "original_name": "test2.txt"}
            ]

            # Act
            result = base_service.bulk_create(items)

            # Assert
            assert mock_db.add.call_count == 2
            mock_db.commit.assert_called_once()

        def test_count(self, base_service, mock_db):
            """测试统计记录数"""
            # Arrange
            mock_db.query.return_value.count.return_value = 100

            # Act
            result = base_service.count()

            # Assert
            assert result == 100

        def test_exists_true(self, base_service, mock_db):
            """测试记录存在检查（存在）"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = Mock()

            # Act
            result = base_service.exists(uuid4())

            # Assert
            assert result is True

        def test_exists_false(self, base_service, mock_db):
            """测试记录存在检查（不存在）"""
            # Arrange
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # Act
            result = base_service.exists(uuid4())

            # Assert
            assert result is False

    class TestServiceConfiguration:
        """测试服务配置"""

        def test_model_class_validation(self, mock_db):
            """测试模型类验证"""
            class InvalidService(BaseService):
                pass

            with pytest.raises(ServiceError) as exc_info:
                InvalidService(mock_db)
            
            assert "model_class must be defined" in str(exc_info.value)

        def test_service_initialization(self, base_service, mock_db):
            """测试服务初始化"""
            assert base_service.db == mock_db
            assert base_service.model_class == Content
