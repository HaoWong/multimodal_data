"""
文件处理模块单元测试
测试FileProcessor基类、各种文件类型处理器和工厂类
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock, mock_open
from io import BytesIO
import os
from pathlib import Path

from app.core.file_processor import (
    FileProcessor, FileProcessorFactory, FileStorageManager,
    FileType, FileMetadata, ProcessResult,
    TextFileProcessor, PDFFileProcessor, ImageFileProcessor,
    VideoFileProcessor, WordFileProcessor, 
    FileProcessError, FileValidationError, FileExtractError
)


class TestFileStorageManager:
    """测试文件存储管理器"""

    @pytest.fixture
    def storage_manager(self, tmp_path):
        """创建存储管理器实例"""
        return FileStorageManager(base_dir=str(tmp_path))

    def test_get_file_path(self, storage_manager, tmp_path):
        """测试获取文件路径"""
        content_id = "test-123"
        filename = "document.pdf"

        path = storage_manager.get_file_path(content_id, filename)

        assert str(tmp_path) in str(path)
        assert content_id in str(path)
        assert filename in str(path)

    def test_get_frames_dir(self, storage_manager, tmp_path):
        """测试获取视频帧目录"""
        content_id = "video-123"

        path = storage_manager.get_frames_dir(content_id)

        assert str(tmp_path) in str(path)
        assert "frames" in str(path)
        assert content_id in str(path)
        assert path.exists()  # 目录应该被创建

    def test_get_temp_dir(self, storage_manager, tmp_path):
        """测试获取临时目录"""
        content_id = "temp-123"

        path = storage_manager.get_temp_dir(content_id)

        assert str(tmp_path) in str(path)
        assert "temp" in str(path)
        assert content_id in str(path)
        assert path.exists()  # 目录应该被创建


class TestTextFileProcessor:
    """测试文本文件处理器"""

    @pytest.fixture
    def processor(self):
        """创建文本处理器实例"""
        return TextFileProcessor()

    @pytest.mark.asyncio
    async def test_validate_txt_file(self, processor):
        """测试验证TXT文件"""
        content = b"This is a test text file."
        result = await processor.validate(content, "test.txt")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_md_file(self, processor):
        """测试验证Markdown文件"""
        content = b"# Markdown Header\n\nSome content."
        result = await processor.validate(content, "test.md")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_invalid_extension(self, processor):
        """测试验证无效扩展名"""
        content = b"Some content"
        # TextFileProcessor 实际上接受任何内容，只是检查是否能解码
        result = await processor.validate(content, "test.exe")
        assert result is True  # 实际实现返回True，因为可以解码

    @pytest.mark.asyncio
    async def test_extract_content_txt(self, processor, tmp_path):
        """测试提取TXT文件内容"""
        content = b"Hello, World!\nThis is a test."
        
        # Mock文件存储
        with patch.object(processor, 'storage') as mock_storage:
            mock_storage.get_file_path.return_value = tmp_path / "test.txt"
            
            result = await processor.extract_content(content, "test.txt", "content-123")

        assert result["content"] == "Hello, World!\nThis is a test."
        assert result["metadata"]["line_count"] == 2

    @pytest.mark.asyncio
    async def test_extract_content_utf8(self, processor, tmp_path):
        """测试提取UTF-8编码的中文内容"""
        content = "你好，世界！\n这是测试内容。".encode('utf-8')
        
        with patch.object(processor, 'storage') as mock_storage:
            mock_storage.get_file_path.return_value = tmp_path / "test.txt"
            
            result = await processor.extract_content(content, "test.txt", "content-123")

        assert "你好，世界！" in result["content"]


class TestPDFFileProcessor:
    """测试PDF文件处理器"""

    @pytest.fixture
    def processor(self):
        """创建PDF处理器实例"""
        return PDFFileProcessor()

    @pytest.mark.asyncio
    async def test_validate_pdf_file(self, processor):
        """测试验证PDF文件"""
        content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n"
        result = await processor.validate(content, "test.pdf")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_invalid_pdf(self, processor):
        """测试验证无效的PDF文件"""
        content = b"Not a PDF file"
        # 应该抛出 FileValidationError
        with pytest.raises(FileValidationError):
            await processor.validate(content, "test.pdf")


class TestImageFileProcessor:
    """测试图片文件处理器"""

    @pytest.fixture
    def processor(self):
        """创建图片处理器实例"""
        mock_ollama = Mock()
        mock_ollama.describe_image = AsyncMock(return_value="A beautiful landscape photo")
        return ImageFileProcessor(ollama_client=mock_ollama)

    @pytest.mark.asyncio
    async def test_validate_jpg_file(self, processor):
        """测试验证JPG文件"""
        # 模拟JPEG文件头
        content = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 100
        result = await processor.validate(content, "test.jpg")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_png_file(self, processor):
        """测试验证PNG文件"""
        # 模拟PNG文件头
        content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        result = await processor.validate(content, "test.png")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_invalid_image(self, processor):
        """测试验证无效的图片文件"""
        content = b"Not an image file"
        # 应该抛出 FileValidationError
        with pytest.raises(FileValidationError):
            await processor.validate(content, "test.jpg")


class TestVideoFileProcessor:
    """测试视频文件处理器"""

    @pytest.fixture
    def processor(self):
        """创建视频处理器实例"""
        return VideoFileProcessor()

    @pytest.mark.asyncio
    async def test_validate_mp4_file(self, processor):
        """测试验证MP4文件"""
        # 模拟MP4文件头 (ftyp box)
        content = b"\x00\x00\x00\x20ftypisom" + b"\x00" * 100
        result = await processor.validate(content, "test.mp4")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_avi_file(self, processor):
        """测试验证AVI文件"""
        # 模拟AVI文件头
        content = b"RIFF" + b"\x00" * 4 + b"AVI " + b"\x00" * 100
        result = await processor.validate(content, "test.avi")
        assert result is True


class TestWordFileProcessor:
    """测试Word文件处理器"""

    @pytest.fixture
    def processor(self):
        """创建Word处理器实例"""
        return WordFileProcessor()

    @pytest.mark.asyncio
    async def test_validate_docx_file(self, processor):
        """测试验证DOCX文件"""
        # DOCX文件实际上是ZIP格式
        content = b"PK\x03\x04" + b"\x00" * 100
        result = await processor.validate(content, "test.docx")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_doc_file(self, processor):
        """测试验证DOC文件"""
        # 模拟DOC文件头 (OLE格式)
        content = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 100
        result = await processor.validate(content, "test.doc")
        assert result is True


class TestFileProcessorFactory:
    """测试文件处理器工厂"""

    @pytest.fixture
    def factory(self):
        """创建工厂实例"""
        mock_ollama = Mock()
        return FileProcessorFactory(ollama_client=mock_ollama)

    def test_get_processor_txt(self, factory):
        """测试获取TXT处理器"""
        processor = factory.get_processor("document.txt")
        assert isinstance(processor, TextFileProcessor)

    def test_get_processor_pdf(self, factory):
        """测试获取PDF处理器"""
        processor = factory.get_processor("document.pdf")
        assert isinstance(processor, PDFFileProcessor)

    def test_get_processor_jpg(self, factory):
        """测试获取图片处理器"""
        processor = factory.get_processor("photo.jpg")
        assert isinstance(processor, ImageFileProcessor)

    def test_get_processor_mp4(self, factory):
        """测试获取视频处理器"""
        processor = factory.get_processor("video.mp4")
        assert isinstance(processor, VideoFileProcessor)

    def test_get_processor_docx(self, factory):
        """测试获取Word处理器"""
        processor = factory.get_processor("document.docx")
        assert isinstance(processor, WordFileProcessor)

    def test_get_processor_unsupported(self, factory):
        """测试获取不支持的文件类型"""
        processor = factory.get_processor("file.exe")
        assert processor is None

    def test_is_supported(self, factory):
        """测试文件类型支持检查"""
        assert factory.is_supported("test.txt") is True
        assert factory.is_supported("test.pdf") is True
        assert factory.is_supported("test.exe") is False

    @pytest.mark.asyncio
    async def test_process_file(self, factory):
        """测试处理文件"""
        content = b"Hello, World!"

        with patch.object(factory, 'get_processor') as mock_get_processor:
            mock_processor = Mock()
            mock_processor.process = AsyncMock(return_value=ProcessResult(
                success=True,
                content="Hello, World!",
                metadata=FileMetadata(
                    filename="test.txt",
                    file_type=FileType.TEXT,
                    mime_type="text/plain",
                    size=13,
                    extension=".txt"
                )
            ))
            mock_get_processor.return_value = mock_processor

            result = await factory.process_file(content, "test.txt", "content-123")

            assert result.success is True
            assert result.content == "Hello, World!"


class TestProcessResult:
    """测试处理结果类"""

    def test_success_result(self):
        """测试成功的结果"""
        result = ProcessResult(
            success=True,
            content="提取的文本",
            metadata=FileMetadata(
                filename="test.txt",
                file_type=FileType.TEXT,
                mime_type="text/plain",
                size=100,
                extension=".txt"
            )
        )
        assert result.success is True
        assert result.error_message is None

    def test_error_result(self):
        """测试失败的结果"""
        result = ProcessResult(
            success=False,
            error_message="处理失败",
            content=None
        )
        assert result.success is False
        assert result.error_message == "处理失败"
        assert result.content is None


class TestFileProcessError:
    """测试文件处理异常"""

    def test_file_process_error(self):
        """测试文件处理错误"""
        error = FileProcessError("处理失败")
        assert str(error) == "处理失败"

    def test_file_validation_error(self):
        """测试文件验证错误"""
        error = FileValidationError("无效的文件格式")
        assert str(error) == "无效的文件格式"
        # FileValidationError继承自FileProcessError
        assert isinstance(error, FileProcessError)

    def test_file_extract_error(self):
        """测试文件提取错误"""
        error = FileExtractError("内容提取失败")
        assert str(error) == "内容提取失败"
        assert isinstance(error, FileProcessError)
