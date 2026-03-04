# API 文档

本文档详细描述多模态RAG系统的API接口。

## 目录

1. [概述](#概述)
2. [统一响应格式](#统一响应格式)
3. [错误码列表](#错误码列表)
4. [API端点](#api端点)
   - [内容管理](#内容管理)
   - [对话](#对话)
   - [Agent](#agent)
   - [Skills](#skills)
   - [任务管理](#任务管理)
5. [使用示例](#使用示例)

---

## 概述

### 基础信息

- **基础URL**: `http://localhost:8000/api`
- **API版本**: `v1.1.0`
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

### 请求格式

所有POST/PUT请求应使用JSON格式：

```http
Content-Type: application/json
```

### 认证

当前版本暂不涉及认证，所有API均可公开访问。

---

## 统一响应格式

### 成功响应

```json
{
    "success": true,
    "data": { ... },
    "message": "操作成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

### 分页响应

```json
{
    "success": true,
    "data": [ ... ],
    "message": "查询成功",
    "pagination": {
        "page": 1,
        "page_size": 10,
        "total": 100,
        "total_pages": 10,
        "has_next": true,
        "has_prev": false
    },
    "timestamp": "2024-01-01T12:00:00"
}
```

### 错误响应

```json
{
    "success": false,
    "error": "资源不存在",
    "code": "3000",
    "message": "资源不存在",
    "details": { ... },
    "timestamp": "2024-01-01T12:00:00"
}
```

---

## 错误码列表

### 通用错误 (1000-1099)

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 1000 | 未知错误 | 500 |
| 1001 | 参数无效 | 400 |
| 1002 | 缺少必要参数 | 400 |
| 1003 | 格式错误 | 400 |
| 1004 | 操作失败 | 500 |

### 认证授权错误 (2000-2099)

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 2000 | 未授权访问 | 401 |
| 2001 | 禁止访问 | 403 |
| 2002 | 令牌已过期 | 401 |
| 2003 | 无效的令牌 | 401 |

### 资源错误 (3000-3099)

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 3000 | 资源不存在 | 404 |
| 3001 | 资源已存在 | 409 |
| 3002 | 资源冲突 | 409 |
| 3003 | 超出资源限制 | 429 |

### 数据库错误 (4000-4099)

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 4000 | 数据库错误 | 500 |
| 4001 | 数据库连接失败 | 500 |
| 4002 | 数据库查询错误 | 500 |
| 4003 | 数据约束冲突 | 400 |

### 业务逻辑错误 (5000-5099)

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 5000 | 业务逻辑错误 | 422 |
| 5001 | 数据验证失败 | 422 |
| 5002 | 操作不允许 | 403 |
| 5003 | 资源不足 | 503 |

### 外部服务错误 (6000-6099)

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 6000 | 外部服务错误 | 502 |
| 6001 | Ollama服务错误 | 502 |
| 6002 | 文件服务错误 | 502 |
| 6003 | 向量服务错误 | 502 |

### 任务执行错误 (7000-7099)

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 7000 | 任务执行错误 | 500 |
| 7001 | 任务执行超时 | 504 |
| 7002 | 任务已取消 | 499 |
| 7003 | 任务执行失败 | 500 |

---

## API端点

### 内容管理

#### 1. 上传内容

```http
POST /contents/upload
```

**请求类型**: `multipart/form-data`

**参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | ✅ | 上传的文件 |
| content_type | string | ❌ | 内容类型: TEXT/IMAGE/VIDEO/AUDIO |
| metadata | JSON | ❌ | 元数据对象 |

**响应示例**:

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "content_type": "IMAGE",
        "original_name": "example.jpg",
        "file_size": 1024000,
        "mime_type": "image/jpeg",
        "source_path": "/uploads/contents/xxx.jpg",
        "description": "图片内容描述...",
        "created_at": "2024-01-01T12:00:00"
    },
    "message": "上传成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 2. 列出内容

```http
GET /contents/
```

**查询参数**:

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| content_type | string | - | 过滤类型: TEXT/IMAGE/VIDEO/AUDIO |
| skip | int | 0 | 跳过记录数 |
| limit | int | 100 | 返回记录数限制 |

**响应示例**:

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "content_type": "IMAGE",
            "original_name": "example.jpg",
            "description": "图片内容描述...",
            "created_at": "2024-01-01T12:00:00"
        }
    ],
    "message": "查询成功",
    "pagination": {
        "page": 1,
        "page_size": 100,
        "total": 50,
        "total_pages": 1,
        "has_next": false,
        "has_prev": false
    },
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 3. 搜索内容

```http
POST /contents/search
```

**请求体**:

```json
{
    "query": "搜索关键词",
    "content_type": "DOCUMENT",
    "top_k": 5,
    "threshold": 0.7
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| query | string | ✅ | - | 搜索关键词 |
| content_type | string | ❌ | - | 过滤类型 |
| top_k | int | ❌ | 5 | 返回结果数量 |
| threshold | float | ❌ | 0.7 | 相似度阈值(0-1) |

**响应示例**:

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "content_type": "DOCUMENT",
            "original_name": "document.pdf",
            "extracted_text": "文档内容...",
            "similarity": 0.85
        }
    ],
    "message": "搜索成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 4. 获取内容详情

```http
GET /contents/{id}
```

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | UUID | ✅ | 内容ID |

**响应示例**:

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "content_type": "VIDEO",
        "original_name": "example.mp4",
        "file_size": 10485760,
        "mime_type": "video/mp4",
        "source_path": "/uploads/contents/xxx.mp4",
        "description": "视频内容描述...",
        "content_metadata": {
            "duration": 120.5,
            "frame_count": 10,
            "resolution": "1920x1080"
        },
        "created_at": "2024-01-01T12:00:00",
        "updated_at": "2024-01-01T12:00:00"
    },
    "message": "查询成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 5. 删除内容

```http
DELETE /contents/{id}
```

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | UUID | ✅ | 内容ID |

**响应示例**:

```json
{
    "success": true,
    "message": "删除成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

### 对话

#### 1. 发送消息

```http
POST /chat
```

**请求体**:

```json
{
    "message": "你好，请介绍一下RAG技术",
    "session_id": "session-uuid",
    "use_rag": true,
    "context": []
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| message | string | ✅ | - | 用户消息 |
| session_id | string | ❌ | 自动生成 | 会话ID |
| use_rag | bool | ❌ | true | 是否使用RAG增强 |
| context | array | ❌ | [] | 历史消息上下文 |

**响应示例**:

```json
{
    "success": true,
    "data": {
        "response": "RAG（检索增强生成）是一种结合信息检索和文本生成的技术...",
        "sources": [
            {
                "content_id": "xxx",
                "content": "相关文档内容...",
                "similarity": 0.85
            }
        ],
        "session_id": "session-uuid"
    },
    "message": "对话成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 2. 流式对话

```http
POST /chat/stream
```

**请求体**: 同上

**响应**: SSE (Server-Sent Events) 流

```
data: {"type": "content", "content": "RAG"}

data: {"type": "content", "content": "（检索增强生成）"}

data: {"type": "sources", "sources": [...]}

data: {"type": "done"}
```

---

#### 3. 获取对话历史

```http
GET /chat/history/{session_id}
```

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | ✅ | 会话ID |

**响应示例**:

```json
{
    "success": true,
    "data": [
        {
            "role": "user",
            "content": "你好",
            "timestamp": "2024-01-01T12:00:00"
        },
        {
            "role": "assistant",
            "content": "你好！有什么可以帮助你的？",
            "timestamp": "2024-01-01T12:00:01"
        }
    ],
    "message": "查询成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

### Agent

#### 1. 执行Agent任务

```http
POST /agent/execute
```

**请求体**:

```json
{
    "description": "分析uploads文件夹中的所有图片并生成报告",
    "context": {
        "files": ["image1.jpg", "image2.jpg"]
    }
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| description | string | ✅ | 任务描述 |
| context | object | ❌ | 任务上下文 |

**响应示例**:

```json
{
    "success": true,
    "data": {
        "task_id": "task-uuid",
        "status": "completed",
        "result": "分析报告内容...",
        "steps": [
            {
                "step": 1,
                "skill": "image_analyze",
                "status": "completed",
                "result": "..."
            }
        ]
    },
    "message": "任务执行成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 2. 流式执行Agent任务

```http
POST /agent/execute/stream
```

**请求体**: 同上

**响应**: SSE (Server-Sent Events) 流

```
data: {"type": "plan", "plan": [...]}

data: {"type": "step_start", "step": 1, "skill": "image_analyze"}

data: {"type": "step_progress", "step": 1, "progress": 50}

data: {"type": "step_complete", "step": 1, "result": "..."}

data: {"type": "complete", "result": "..."}
```

---

#### 3. 获取任务状态

```http
GET /agent/task/{task_id}
```

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| task_id | string | ✅ | 任务ID |

**响应示例**:

```json
{
    "success": true,
    "data": {
        "task_id": "task-uuid",
        "status": "running",
        "description": "分析图片...",
        "progress": 50,
        "created_at": "2024-01-01T12:00:00",
        "updated_at": "2024-01-01T12:00:30"
    },
    "message": "查询成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

### Skills

#### 1. 列出所有Skills

```http
GET /skills/
```

**响应示例**:

```json
{
    "success": true,
    "data": [
        {
            "name": "content_extract",
            "description": "提取文档/分析图片/分析视频内容",
            "parameters": [
                {
                    "name": "file_path",
                    "type": "string",
                    "description": "文件路径",
                    "required": true
                }
            ],
            "return_type": "string",
            "tags": ["builtin", "content"]
        },
        {
            "name": "vector_search",
            "description": "语义搜索向量数据库中的内容",
            "parameters": [
                {
                    "name": "query",
                    "type": "string",
                    "description": "搜索查询",
                    "required": true
                },
                {
                    "name": "top_k",
                    "type": "integer",
                    "description": "返回结果数量",
                    "required": false
                }
            ],
            "return_type": "array",
            "tags": ["builtin", "search"]
        }
    ],
    "message": "查询成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 2. 调用Skill

```http
POST /skills/invoke/{skill_name}
```

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| skill_name | string | ✅ | Skill名称 |

**请求体**:

```json
{
    "params": {
        "query": "机器学习",
        "top_k": 5
    }
}
```

**响应示例**:

```json
{
    "success": true,
    "data": {
        "skill_name": "vector_search",
        "execution_time": 0.523,
        "results": [
            {
                "id": "xxx",
                "content": "机器学习是...",
                "similarity": 0.85
            }
        ]
    },
    "message": "Skill执行成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

### 任务管理

#### 1. 获取运行中任务

```http
GET /tasks/running
```

**响应示例**:

```json
{
    "success": true,
    "data": [
        {
            "task_id": "task-uuid",
            "status": "running",
            "description": "分析图片...",
            "progress": 50,
            "created_at": "2024-01-01T12:00:00"
        }
    ],
    "message": "查询成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

#### 2. 获取任务详情

```http
GET /tasks/{task_id}
```

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| task_id | string | ✅ | 任务ID |

**响应示例**:

```json
{
    "success": true,
    "data": {
        "task_id": "task-uuid",
        "status": "completed",
        "description": "分析图片...",
        "result": "分析结果...",
        "execution_time": 5.23,
        "created_at": "2024-01-01T12:00:00",
        "completed_at": "2024-01-01T12:00:05"
    },
    "message": "查询成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

---

## 使用示例

### 示例1：完整的上传和分析流程

```bash
# 1. 上传图片
curl -X POST http://localhost:8000/api/contents/upload \
  -F "file=@example.jpg" \
  -F "content_type=IMAGE"

# 响应
# {
#   "success": true,
#   "data": {
#     "id": "550e8400-e29b-41d4-a716-446655440000",
#     "description": "一只猫在沙发上睡觉..."
#   }
# }

# 2. 使用Agent分析图片
curl -X POST http://localhost:8000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "description": "分析刚才上传的图片，描述其中的内容",
    "context": {
      "content_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }'
```

### 示例2：RAG对话流程

```bash
# 1. 上传文档
curl -X POST http://localhost:8000/api/contents/upload \
  -F "file=@document.pdf" \
  -F "content_type=DOCUMENT"

# 2. 进行RAG对话
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "文档中提到了哪些关键技术？",
    "session_id": "my-session-001",
    "use_rag": true
  }'
```

### 示例3：直接调用Skill

```bash
# 向量搜索
curl -X POST http://localhost:8000/api/skills/invoke/vector_search \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "query": "深度学习",
      "content_type": "DOCUMENT",
      "top_k": 3
    }
  }'

# 文本向量化
curl -X POST http://localhost:8000/api/skills/invoke/text_embed \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "text": "需要向量化的文本内容"
    }
  }'
```

### 示例4：前端JavaScript调用

```javascript
// 上传文件
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('content_type', 'IMAGE');
    
    const response = await fetch('http://localhost:8000/api/contents/upload', {
        method: 'POST',
        body: formData
    });
    
    return await response.json();
}

// 流式对话
async function chatStream(message, onChunk) {
    const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, use_rag: true })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                onChunk(data);
            }
        }
    }
}
```

---

## 附录

### 内容类型枚举

| 类型 | 说明 | 支持的文件格式 |
|------|------|---------------|
| TEXT | 文本 | .txt, .md, .json |
| DOCUMENT | 文档 | .pdf, .doc, .docx |
| IMAGE | 图片 | .jpg, .jpeg, .png, .gif, .webp |
| VIDEO | 视频 | .mp4, .avi, .mov, .mkv |
| AUDIO | 音频 | .mp3, .wav, .aac |

### 任务状态枚举

| 状态 | 说明 |
|------|------|
| pending | 等待中 |
| running | 运行中 |
| completed | 已完成 |
| failed | 失败 |
| retrying | 重试中 |
| timeout | 超时 |

---

*文档版本: 1.0*  
*更新日期: 2026-03-04*
