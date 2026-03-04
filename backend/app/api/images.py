"""
图片管理API - 已废弃

⚠️ 警告：此模块已废弃，功能已迁移到 contents.py

请使用新的端点：
- POST   /api/contents/images/upload  - 上传图片
- GET    /api/contents/images/list    - 列出图片
- GET    /api/contents/images/{id}    - 获取图片详情
- DELETE /api/contents/images/{id}    - 删除图片
- POST   /api/contents/images/search  - 搜索图片

保留此文件是为了向后兼容，将在未来版本中移除。
"""

# 此文件内容已迁移到 contents.py
# 请勿在此文件中添加新代码

__deprecated__ = True
__migration_target__ = "contents.py"
