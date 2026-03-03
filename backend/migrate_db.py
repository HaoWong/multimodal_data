#!/usr/bin/env python3
"""数据库迁移脚本 - 添加 file_path 字段到 documents 表"""
import sys
sys.path.insert(0, '.')

from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()

def migrate():
    """执行数据库迁移"""
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # 检查字段是否已存在
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'file_path'
        """))
        
        if result.fetchone():
            print("✅ file_path 字段已存在，无需迁移")
            return
        
        # 添加 file_path 字段
        conn.execute(text("""
            ALTER TABLE documents 
            ADD COLUMN file_path VARCHAR(500)
        """))
        conn.commit()
        print("✅ 成功添加 file_path 字段到 documents 表")

if __name__ == "__main__":
    migrate()
