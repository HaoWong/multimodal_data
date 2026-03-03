# 项目宪法 - Multimodal RAG System

## 核心原则

### 1. 数据安全第一
**任何代码更新不得影响已有用户数据**

- 禁止删除或修改已有数据库表结构
- 禁止删除已有数据文件
- 所有数据库变更必须是增量的（添加新字段/表）
- 所有文件操作必须先检查是否存在

### 2. 向后兼容
**新代码必须兼容旧数据**

- 新字段必须有默认值或为 nullable
- API 接口变更必须保持旧接口可用
- 配置文件变更必须兼容旧配置

### 3. 测试驱动
**任何功能修改必须通过核心测试**

运行以下测试验证：
```bash
cd backend
python scripts/run_core_tests.py
```

6个核心测试必须全部通过：
1. 知识库文档上传 + RAG对话
2. 图片库列表
3. 视频库列表
4. 内容库上传 + RAG对话
5. 基础对话
6. 带历史记录的对话

---

## 数据库变更规范

### 允许的操作
✅ **添加新表** - 不影响已有数据
✅ **添加新字段** - 必须为 nullable 或有默认值
✅ **添加索引** - 提高查询性能
✅ **创建新关联表** - 扩展功能

### 禁止的操作
❌ **删除表** - 会导致数据丢失
❌ **删除字段** - 会导致数据丢失
❌ **修改字段类型** - 可能导致数据转换失败
❌ **重命名字段** - 会破坏已有查询
❌ **修改主键** - 会破坏关联关系

### 变更流程
1. 创建迁移脚本 `migrate_db.py`
2. 检查字段是否已存在（幂等性）
3. 使用 ALTER TABLE ADD COLUMN（不是重建表）
4. 测试迁移脚本
5. 提交代码

**示例迁移脚本：**
```python
#!/usr/bin/env python3
"""数据库迁移脚本"""
from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()

def migrate():
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # 1. 检查字段是否已存在（幂等性）
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '表名' AND column_name = '新字段'
        """))
        
        if result.fetchone():
            print("✅ 字段已存在，无需迁移")
            return
        
        # 2. 添加新字段（nullable 或有默认值）
        conn.execute(text("""
            ALTER TABLE 表名 
            ADD COLUMN 新字段 VARCHAR(500) NULL
        """))
        conn.commit()
        print("✅ 迁移成功")

if __name__ == "__main__":
    migrate()
```

---

## 文件操作规范

### 上传文件
- 使用 UUID 命名文件，避免冲突
- 保存原始文件名到数据库
- 文件路径存储在数据库中

### 删除文件
- 必须先检查文件是否存在
- 捕获并记录异常，不中断流程
- 数据库记录和文件必须一起删除

**示例代码：**
```python
import os

# 删除文件时
def delete_file(file_path):
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"删除文件失败: {e}")
            # 继续执行，不中断
```

---

## API 设计规范

### 版本控制
- URL 中包含版本号：`/api/v1/...`
- 重大变更时升级版本号
- 保持旧版本 API 可用

### 请求/响应
- 使用 Pydantic 模型验证
- 可选字段使用 `Optional`
- 新增字段必须有默认值

**示例：**
```python
from pydantic import BaseModel, Field
from typing import Optional

class DocumentCreate(BaseModel):
    title: str
    content: str
    # 新增字段 - 必须有默认值
    new_field: Optional[str] = Field(default=None)
```

---

## 测试规范

### 运行测试
```bash
# 运行核心测试
python scripts/run_core_tests.py

# 运行所有测试
pytest tests/ -v
```

### 测试要求
- 任何代码修改前必须运行测试
- 测试失败不能提交代码
- 新增功能必须添加对应测试

---

## 代码提交规范

### 提交前检查清单
- [ ] 运行了核心测试且全部通过
- [ ] 检查了数据库变更是否安全
- [ ] 检查了文件操作是否安全
- [ ] 确认没有删除或修改已有数据

### 提交信息格式
```
[类型] 简短描述

详细说明：
- 做了什么修改
- 为什么需要这个修改
- 如何测试的

数据影响：无/新增字段/新增表
```

**类型：**
- `feat`: 新功能
- `fix`: 修复
- `refactor`: 重构
- `docs`: 文档
- `test`: 测试
- `chore`: 杂项

---

## 违规处理

### 如果违反了规范：
1. 立即停止当前工作
2. 回滚到上一个稳定版本
3. 修复问题
4. 重新运行所有测试
5. 确保数据完整

### 数据恢复流程
1. 检查数据库备份
2. 检查文件备份
3. 使用备份恢复
4. 验证数据完整性

---

## 附则

### 本宪法自 2026-03-03 起生效
### 任何修改必须经过代码审查
### 数据安全第一，功能第二

---

**签署：**
- 项目维护者
- 开发团队成员
- 测试团队成员
