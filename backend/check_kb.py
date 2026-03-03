#!/usr/bin/env python3
"""检查知识库"""
import sys
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.database_models import Document

db = SessionLocal()
try:
    docs = db.query(Document).all()
    print(f'知识库文档数量: {len(docs)}')
    for doc in docs[:5]:
        print(f'  - {doc.title} (ID: {doc.id})')
except Exception as e:
    print(f'错误: {e}')
    import traceback
    traceback.print_exc()
finally:
    db.close()
