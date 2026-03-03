---
name: image_analyze
description: 使用AI视觉模型分析图片内容
tags: [image, vision, analysis]
---

## 参数定义

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| image_path | string | 是 | 图片文件路径 |

## 执行提示词

```
你是图像分析专家。请详细描述这张图片：

图片路径：{{image_path}}

请从以下维度分析：
1. 整体场景描述
2. 主要对象识别
3. 文字内容（如有）
4. 色彩风格
5. 构图特点
6. 可能的含义或用途

输出结构化描述。
```

## 代码实现

```python
async def execute(image_path: str) -> dict:
    from app.services.ollama_client import ollama_client
    
    # 查找文件
    full_path = find_file(image_path)
    if not full_path:
        return {"error": f"图片不存在: {image_path}"}
    
    # AI分析
    description = await ollama_client.describe_image(full_path)
    
    return {
        "description": description,
        "path": full_path
    }

def find_file(filename: str) -> str:
    if os.path.exists(filename):
        return filename
    
    upload_dirs = ["uploads/images", "uploads/contents"]
    for upload_dir in upload_dirs:
        if not os.path.exists(upload_dir):
            continue
        for root, dirs, files in os.walk(upload_dir):
            if filename in files:
                return os.path.join(root, filename)
    return None
```
