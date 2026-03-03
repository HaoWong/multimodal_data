#!/usr/bin/env python3
"""检查数据库中的数据"""
import sys
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.database_models import Document, Image, Conversation
from app.models.content_models import Content

db = SessionLocal()

doc_count = db.query(Document).count()
img_count = db.query(Image).count()
content_count = db.query(Content).count()
conv_count = db.query(Conversation).count()

print('='*50)
print('📊 数据库内容统计')
print('='*50)
print(f'📚 知识库文档: {doc_count} 个')
print(f'🖼️  图片库: {img_count} 张')
print(f'📄 内容库: {content_count} 个')
print(f'💬 对话记录: {conv_count} 条')
print('='*50)

if doc_count > 0:
    print('\n📚 知识库文档列表:')
    for doc in db.query(Document).limit(5).all():
        print(f'  - {doc.title} (ID: {doc.id})')

if img_count > 0:
    print('\n🖼️  图片库列表:')
    for img in db.query(Image).limit(5).all():
        name = img.original_name or (img.description[:30] + '...' if img.description else '未命名')
        print(f'  - {name}')

if content_count > 0:
    print('\n📄 内容库列表:')
    for c in db.query(Content).limit(5).all():
        print(f'  - {c.original_name} (类型: {c.content_type})')

db.close()
