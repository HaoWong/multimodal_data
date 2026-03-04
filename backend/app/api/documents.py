"""
文档管理API - 已废弃

⚠️ 警告：此模块已废弃，功能已迁移到 contents.py

请使用新的端点：
- POST   /api/contents/documents/upload  - 上传文档
- GET    /api/contents/documents/list    - 列出文档
- GET    /api/contents/documents/{id}    - 获取文档详情
- DELETE /api/contents/documents/{id}    - 删除文档
- POST   /api/contents/documents/search  - 搜索文档
- POST   /api/contents/documents/create  - 创建文档

保留此文件是为了向后兼容，将在未来版本中移除。
"""

# 此文件内容已迁移到 contents.py
# 请勿在此文件中添加新代码

__deprecated__ = True
__migration_target__ = "contents.py"
