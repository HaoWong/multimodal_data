---
name: content_extract
description: 从文档、图片、视频或ZIP压缩包中提取和分析内容
version: 1.0.0
author: system
tags: [extraction, document, image, video, zip, analysis]
---

## 参数定义

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| file_path | string | 是 | 文件路径或文件名 |

## 功能说明

自动根据文件类型选择处理方式：
- **文档** (.pdf/.doc/.docx/.txt/.md)：提取文本内容
- **图片** (.jpg/.jpeg/.png/.gif)：AI视觉分析描述
- **视频** (.mp4/.avi/.mov/.wmv)：提取关键帧并分析
- **ZIP** (.zip)：解压并递归分析所有内容

## 执行提示词

```
你是内容分析专家。请分析以下文件：

文件路径：{{file_path}}

请根据文件类型提取或分析内容：
- 文档：提取完整文本，保留格式结构
- 图片：详细描述图片内容、场景、文字、人物等
- 视频：提取关键帧，描述视频主要内容和流程
- ZIP：解压后分析每个文件，汇总所有内容

输出要求：
1. 文件类型识别
2. 内容摘要（500字以内）
3. 关键信息提取
4. 如果是ZIP，列出所有文件及各自分析
```

## 代码实现

```python
import os
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any

async def execute(file_path: str) -> Dict[str, Any]:
    """执行内容提取"""
    from app.services.ollama_client import ollama_client
    from app.utils.video_processor import video_processor
    
    # 查找文件
    full_path = find_file(file_path)
    if not full_path:
        return {"error": f"文件不存在: {file_path}"}
    
    filename = os.path.basename(full_path)
    
    # 根据文件类型处理
    if filename.endswith('.zip'):
        return await analyze_zip(full_path, ollama_client, video_processor)
    elif filename.endswith('.pdf'):
        return await analyze_pdf(full_path)
    elif filename.endswith(('.docx', '.doc')):
        return await analyze_word(full_path)
    elif filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
        return await analyze_image(full_path, ollama_client)
    elif filename.lower().endswith(('.mp4', '.avi', '.mov', '.wmv')):
        return await analyze_video(full_path, ollama_client, video_processor)
    else:
        return await analyze_text(full_path)

def find_file(filename: str) -> str:
    """查找文件 - 支持原始文件名和UUID文件名"""
    # 1. 直接检查是否是完整路径
    if os.path.exists(filename):
        return filename
    
    # 2. 从数据库查找文件记录
    try:
        from app.core.database import SessionLocal
        from app.models.content_models import Content
        
        db = SessionLocal()
        try:
            # 按原始文件名查找
            content = db.query(Content).filter(
                Content.original_name == filename
            ).first()
            
            if content and content.source_path and os.path.exists(content.source_path):
                return content.source_path
        finally:
            db.close()
    except Exception as e:
        print(f"[find_file] 数据库查询失败: {e}")
    
    # 3. 在upload目录中按原始文件名查找
    upload_dirs = ["uploads/images", "uploads/contents", "uploads/documents"]
    for upload_dir in upload_dirs:
        if not os.path.exists(upload_dir):
            continue
        for root, dirs, files in os.walk(upload_dir):
            if filename in files:
                return os.path.join(root, filename)
    
    # 4. 尝试匹配文件名（不包含路径）
    basename = os.path.basename(filename)
    for upload_dir in upload_dirs:
        if not os.path.exists(upload_dir):
            continue
        for root, dirs, files in os.walk(upload_dir):
            for f in files:
                # 检查原始文件名是否匹配
                if f == basename or f.endswith(basename) or basename.endswith(f):
                    return os.path.join(root, f)
    
    return None

async def analyze_zip(file_path: str, ollama_client, video_processor) -> Dict:
    """分析ZIP文件"""
    import zipfile
    from io import BytesIO
    
    file_list = []
    analysis_results = []
    temp_dir = tempfile.mkdtemp(prefix="zip_extract_")
    
    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            zf.extractall(temp_dir)
            
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, temp_dir)
                    file_list.append(rel_path)
                    
                    # 递归分析
                    try:
                        if file.endswith(('.txt', '.md', '.py', '.js')):
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                text = f.read()
                                analysis_results.append({"file": rel_path, "type": "text", "content": text[:2000]})
                        elif file.endswith('.pdf'):
                            # PDF分析...
                            pass
                        elif file.lower().endswith(('.jpg', '.png')):
                            desc = await ollama_client.describe_image(file_path)
                            analysis_results.append({"file": rel_path, "type": "image", "description": desc})
                        elif file.lower().endswith(('.mp4', '.avi')):
                            import uuid
                            result = await video_processor.process_video(file_path, str(uuid.uuid4()), ollama_client, max_frames=5)
                            analysis_results.append({"file": rel_path, "type": "video", "duration": result['duration'], "description": result['overall_description'][:1500]})
                    except Exception as e:
                        analysis_results.append({"file": rel_path, "type": "error", "error": str(e)})
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    return {
        "file_count": len(file_list),
        "files": file_list,
        "analysis": analysis_results
    }

async def analyze_pdf(file_path: str) -> Dict:
    """分析PDF"""
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return {"type": "pdf", "content": text, "pages": len(reader.pages)}

async def analyze_word(file_path: str) -> Dict:
    """分析Word"""
    from docx import Document
    doc = Document(file_path)
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return {"type": "word", "content": text, "paragraphs": len(doc.paragraphs)}

async def analyze_image(file_path: str, ollama_client) -> Dict:
    """分析图片"""
    description = await ollama_client.describe_image(file_path)
    return {"type": "image", "description": description}

async def analyze_video(file_path: str, ollama_client, video_processor) -> Dict:
    """分析视频"""
    import uuid
    result = await video_processor.process_video(file_path, str(uuid.uuid4()), ollama_client, max_frames=8)
    return {
        "type": "video",
        "duration": result['duration'],
        "frames": len(result['frames']),
        "description": result['overall_description']
    }

async def analyze_text(file_path: str) -> Dict:
    """分析文本文件"""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    return {"type": "text", "content": content}
```
