---
name: vector_search
description: 使用向量检索从知识库中搜索相关内容
tags: [search, rag, vector, retrieval]
---

## 参数定义

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| query | string | 是 | 搜索查询 |
| top_k | number | 否 | 返回结果数量，默认5 |
| content_type | string | 否 | 内容类型过滤（image/video/text） |

## 执行提示词

```
你是检索专家。请基于以下查询搜索知识库：

查询：{{query}}
{{#if content_type}}
内容类型：{{content_type}}
{{/if}}

从知识库中检索最相关的内容。
```

## 代码实现

```python
async def execute(query: str, top_k: int = 5, content_type: str = None) -> dict:
    from app.services.ollama_client import ollama_client
    from app.core.database import SessionLocal
    from app.models.content_models import Content
    from sqlalchemy import text
    import json
    
    db = SessionLocal()
    try:
        # 生成查询向量
        query_embedding = await ollama_client.embed([query])
        query_vector = query_embedding[0]
        
        # 构建SQL
        sql = """
            SELECT id, original_name, content_type, description, extracted_text,
                   1 - (embedding <=> :query_vector) as similarity
            FROM contents
            WHERE 1 - (embedding <=> :query_vector) > 0.5
        """
        
        if content_type:
            sql += f" AND content_type = '{content_type}'"
        
        sql += f" ORDER BY similarity DESC LIMIT {top_k}"
        
        result = db.execute(text(sql), {"query_vector": str(query_vector)})
        
        sources = []
        for row in result:
            sources.append({
                "id": str(row.id),
                "title": row.original_name,
                "type": row.content_type.value if hasattr(row.content_type, 'value') else str(row.content_type),
                "content": row.extracted_text or row.description or "",
                "similarity": round(float(row.similarity), 3)
            })
        
        return {
            "query": query,
            "sources": sources,
            "count": len(sources)
        }
    finally:
        db.close()
```
