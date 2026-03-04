"""
统一文件处理器使用示例
展示如何使用 FileProcessor 处理不同类型的文件
"""
import asyncio
from pathlib import Path


async def example_basic_usage():
    """基本使用示例 - 使用工厂类自动处理文件"""
    from app.core.file_processor import (
        FileProcessorFactory,
        process_upload_file,
        FileStorageManager
    )
    from app.services.ollama_client import OllamaClient
    
    # 初始化 Ollama 客户端
    ollama_client = OllamaClient()
    
    # 方法1: 使用工厂类处理文件
    factory = FileProcessorFactory(ollama_client=ollama_client)
    
    # 读取示例文件
    file_path = Path("example.pdf")
    if file_path.exists():
        file_content = file_path.read_bytes()
        
        # 处理文件（自动选择处理器）
        result = await factory.process_file(
            file_content=file_content,
            filename="example.pdf",
            content_id="content_123",
            generate_embedding=True
        )
        
        if result.success:
            print(f"处理成功!")
            print(f"内容: {result.content[:200]}...")
            print(f"元数据: {result.metadata}")
        else:
            print(f"处理失败: {result.error_message}")


async def example_specific_processor():
    """使用特定处理器示例"""
    from app.core.file_processor import (
        FileProcessorFactory,
        FileType,
        PDFFileProcessor,
        VideoFileProcessor
    )
    from app.services.ollama_client import OllamaClient
    
    ollama_client = OllamaClient()
    factory = FileProcessorFactory(ollama_client=ollama_client)
    
    # 获取特定类型的处理器
    pdf_processor = factory.get_processor_by_type(FileType.PDF)
    
    # 或者直接实例化
    video_processor = VideoFileProcessor(ollama_client=ollama_client)
    
    # 使用特定处理器处理文件
    # result = await pdf_processor.process(file_content, "doc.pdf", "id_123")


async def example_fastapi_upload():
    """FastAPI 上传文件处理示例"""
    from fastapi import FastAPI, UploadFile, File
    from app.core.file_processor import process_upload_file
    from app.services.ollama_client import ollama_client
    
    app = FastAPI()
    
    @app.post("/upload")
    async def upload_file(file: UploadFile = File(...)):
        """处理上传的文件"""
        content_id = f"content_{file.filename}"
        
        # 处理上传的文件
        result = await process_upload_file(
            upload_file=file,
            content_id=content_id,
            ollama_client=ollama_client,
            generate_embedding=True
        )
        
        if result.success:
            return {
                "success": True,
                "content_id": content_id,
                "file_type": result.metadata.file_type.value,
                "content_preview": result.content[:500] if result.content else None,
                "has_embedding": result.embedding is not None
            }
        else:
            return {
                "success": False,
                "error": result.error_message
            }


async def example_storage_management():
    """文件存储管理示例"""
    from app.core.file_processor import FileStorageManager
    
    # 创建存储管理器
    storage = FileStorageManager(base_dir="uploads")
    
    content_id = "doc_123"
    
    # 获取各类路径
    file_path = storage.get_file_path(content_id, "document.pdf")
    frames_dir = storage.get_frames_dir(content_id)
    temp_dir = storage.get_temp_dir(content_id)
    thumbnail_path = storage.get_thumbnail_path(content_id, "jpg")
    extracted_dir = storage.get_extracted_dir(content_id)
    
    print(f"文件路径: {file_path}")
    print(f"帧目录: {frames_dir}")
    print(f"临时目录: {temp_dir}")
    
    # 清理临时文件
    # storage.cleanup(content_id)


async def example_custom_processor():
    """自定义处理器扩展示例"""
    from app.core.file_processor import (
        FileProcessor,
        FileType,
        FileValidationError,
        FileExtractError,
        FileProcessorFactory
    )
    from typing import Dict, Any, Optional
    
    class ExcelFileProcessor(FileProcessor):
        """Excel文件处理器示例"""
        
        SUPPORTED_EXTENSIONS = ('.xlsx', '.xls')
        FILE_TYPE = FileType.TEXT  # 可以定义为新的类型
        
        async def validate(self, file_content: bytes, filename: str) -> bool:
            # 检查文件大小
            if len(file_content) > 10 * 1024 * 1024:
                raise FileValidationError("Excel文件超过10MB限制")
            return True
        
        async def extract_content(
            self,
            file_content: bytes,
            filename: str,
            content_id: Optional[str] = None
        ) -> Dict[str, Any]:
            try:
                # 这里可以使用 pandas 或 openpyxl 读取 Excel
                # import pandas as pd
                # df = pd.read_excel(io.BytesIO(file_content))
                # content = df.to_string()
                
                content = "Excel内容提取示例"
                
                return {
                    "content": content,
                    "metadata": {"sheets": 1},
                    "extra_data": {},
                    "chunks": []
                }
            except Exception as e:
                raise FileExtractError(f"Excel解析失败: {str(e)}")
    
    # 注册自定义处理器
    FileProcessorFactory.register_processor(ExcelFileProcessor)
    
    # 现在工厂可以处理 Excel 文件了
    factory = FileProcessorFactory()
    # result = await factory.process_file(excel_content, "data.xlsx", "id_123")


async def example_batch_processing():
    """批量处理文件示例"""
    from app.core.file_processor import FileProcessorFactory
    from app.services.ollama_client import OllamaClient
    import aiofiles
    
    ollama_client = OllamaClient()
    factory = FileProcessorFactory(ollama_client=ollama_client)
    
    # 批量处理文件
    files_to_process = [
        ("doc1.pdf", "content_1"),
        ("doc2.docx", "content_2"),
        ("image.png", "content_3"),
    ]
    
    results = []
    for filename, content_id in files_to_process:
        file_path = Path(filename)
        if file_path.exists():
            async with aiofiles.open(file_path, 'rb') as f:
                content = await f.read()
            
            result = await factory.process_file(
                content,
                filename,
                content_id,
                generate_embedding=True
            )
            results.append(result)
    
    # 统计处理结果
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful
    
    print(f"处理完成: {successful} 成功, {failed} 失败")


async def example_error_handling():
    """错误处理示例"""
    from app.core.file_processor import (
        FileProcessorFactory,
        FileValidationError,
        FileExtractError,
        FileProcessError
    )
    
    factory = FileProcessorFactory()
    
    try:
        # 尝试处理不支持的文件
        result = await factory.process_file(
            b"some content",
            "unknown.xyz",
            "id_123"
        )
        
        if not result.success:
            print(f"处理失败: {result.error_message}")
            
    except FileValidationError as e:
        print(f"验证错误: {e}")
    except FileExtractError as e:
        print(f"提取错误: {e}")
    except FileProcessError as e:
        print(f"处理错误: {e}")


def example_sync_usage():
    """同步使用示例"""
    from app.core.file_processor import FileProcessorFactory
    
    async def process():
        factory = FileProcessorFactory()
        
        # 检查支持的文件类型
        extensions = FileProcessorFactory.get_supported_extensions()
        print(f"支持的扩展名: {extensions}")
        
        # 检查文件是否受支持
        is_supported = FileProcessorFactory.is_supported("document.pdf")
        print(f"PDF是否支持: {is_supported}")
    
    # 运行异步代码
    asyncio.run(process())


# 完整的服务端点示例
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.file_processor import (
    FileProcessorFactory,
    FileStorageManager,
    ProcessResult
)
from app.services.ollama_client import OllamaClient, ollama_client

router = APIRouter()

@router.post("/contents/upload")
async def upload_content(
    file: UploadFile = File(...),
    ollama: OllamaClient = Depends(lambda: ollama_client)
):
    # 生成内容ID
    import uuid
    content_id = str(uuid.uuid4())
    
    # 创建工厂
    factory = FileProcessorFactory(ollama_client=ollama)
    
    # 检查文件类型
    if not FileProcessorFactory.is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持的格式: {FileProcessorFactory.get_supported_extensions()}"
        )
    
    # 读取文件内容
    content = await file.read()
    
    # 处理文件
    result = await factory.process_file(
        file_content=content,
        filename=file.filename,
        content_id=content_id,
        generate_embedding=True
    )
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error_message)
    
    # 保存到数据库（示例）
    # await save_to_database(content_id, result)
    
    return {
        "id": content_id,
        "filename": result.metadata.filename,
        "file_type": result.metadata.file_type.value,
        "size": result.metadata.size,
        "content_preview": result.content[:1000] if result.content else None,
        "metadata": result.metadata.extra,
        "extra_data": result.extra_data
    }


@router.delete("/contents/{content_id}")
async def delete_content(content_id: str):
    # 清理文件
    storage = FileStorageManager()
    storage.cleanup(content_id)
    
    # 从数据库删除
    # await delete_from_database(content_id)
    
    return {"message": "内容已删除"}
"""


if __name__ == "__main__":
    # 运行示例
    print("=" * 50)
    print("文件处理器使用示例")
    print("=" * 50)
    
    # 显示支持的文件类型
    from app.core.file_processor import FileProcessorFactory
    
    extensions = FileProcessorFactory.get_supported_extensions()
    print(f"\n支持的文件扩展名:")
    for ext in extensions:
        print(f"  - {ext}")
    
    # 运行异步示例
    # asyncio.run(example_basic_usage())
