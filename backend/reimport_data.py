#!/usr/bin/env python3
"""重新导入上传目录中的文件到数据库"""
import sys
import os
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.content_models import Content, ContentType
from app.models.database_models import Image
from app.services.ollama_client import ollama_client
import asyncio

db = SessionLocal()

upload_dir = "uploads"
contents_dir = os.path.join(upload_dir, "contents")
images_dir = os.path.join(upload_dir, "images")

async def reimport_contents():
    """重新导入内容库文件"""
    print("📄 重新导入内容库文件...")
    
    imported = 0
    for filename in os.listdir(contents_dir):
        file_path = os.path.join(contents_dir, filename)
        if not os.path.isfile(file_path):
            continue
            
        # 检查是否已存在
        existing = db.query(Content).filter(Content.source_path == file_path).first()
        if existing:
            continue
        
        # 确定文件类型
        ext = os.path.splitext(filename)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']:
            content_type = ContentType.IMAGE
        elif ext in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
            content_type = ContentType.VIDEO
        else:
            content_type = ContentType.TEXT
        
        # 创建记录
        content = Content(
            content_type=content_type,
            source_path=file_path,
            original_name=filename,
            file_size=os.path.getsize(file_path),
            mime_type=f"application/{ext.lstrip('.')}" if ext else "application/octet-stream"
        )
        db.add(content)
        imported += 1
        print(f"  + {filename} ({content_type.value})")
    
    db.commit()
    print(f"✅ 导入了 {imported} 个内容文件")


def reimport_images():
    """重新导入图片库文件"""
    print("\n🖼️  重新导入图片库文件...")
    
    imported = 0
    for filename in os.listdir(images_dir):
        file_path = os.path.join(images_dir, filename)
        if not os.path.isfile(file_path):
            continue
        
        # 检查是否已存在
        existing = db.query(Image).filter(Image.image_path == file_path).first()
        if existing:
            continue
        
        # 创建记录
        image = Image(
            image_path=file_path,
            description=f"图片: {filename}"
        )
        db.add(image)
        imported += 1
        print(f"  + {filename}")
    
    db.commit()
    print(f"✅ 导入了 {imported} 张图片")


async def main():
    print("="*50)
    print("🔄 重新导入数据到数据库")
    print("="*50)
    print()
    
    await reimport_contents()
    reimport_images()
    
    print()
    print("="*50)
    print("✅ 数据导入完成！")
    print("="*50)
    
    # 显示统计
    from app.models.database_models import Document, Conversation
    
    doc_count = db.query(Document).count()
    img_count = db.query(Image).count()
    content_count = db.query(Content).count()
    conv_count = db.query(Conversation).count()
    
    print(f"\n📊 当前数据库状态:")
    print(f"  📚 知识库文档: {doc_count} 个")
    print(f"  🖼️  图片库: {img_count} 张")
    print(f"  📄 内容库: {content_count} 个")
    print(f"  💬 对话记录: {conv_count} 条")


if __name__ == "__main__":
    asyncio.run(main())
    db.close()
