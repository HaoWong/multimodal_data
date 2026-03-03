import io
from fastapi import UploadFile


async def parse_file(file: UploadFile) -> str:
    """解析上传的文件内容"""
    content = await file.read()
    filename = file.filename.lower()
    
    # 检查是否为图片文件
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
    if filename.endswith(image_extensions):
        raise ValueError(f"图片文件请使用图片上传功能: {file.filename}")
    
    if filename.endswith('.pdf'):
        return parse_pdf(content)
    elif filename.endswith(('.docx', '.doc')):
        return parse_docx(content)
    elif filename.endswith('.txt'):
        return content.decode('utf-8')
    else:
        # 尝试作为文本读取
        try:
            return content.decode('utf-8')
        except:
            raise ValueError(f"不支持的文件格式: {file.filename}")


def parse_pdf(content: bytes) -> str:
    """解析PDF文件"""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"PDF解析失败: {str(e)}")


def parse_docx(content: bytes) -> str:
    """解析Word文档"""
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"DOCX解析失败: {str(e)}")
