# 多模态RAG系统 - 架构文档

## 一、系统概述

### 1.1 项目简介

多模态RAG（检索增强生成）系统是一个基于 PostgreSQL + pgvector + Ollama 的智能文档检索与对话平台。系统支持文本、图片、视频等多种模态内容的统一存储、向量化和智能检索，通过Agent引擎实现复杂的任务规划和技能编排。

### 1.2 核心特性

- **多模态支持**：统一处理文本、图片、视频、音频内容
- **向量检索**：基于 BGE-M3 模型的语义搜索
- **Agent引擎**：自动任务规划、技能编排、多步推理
- **Skill系统**：可扩展的技能插件架构
- **流式响应**：支持SSE实时流式输出
- **现代化UI**：React + Ant Design 的响应式界面
- **统一响应格式**：标准化的API响应结构
- **统一任务引擎**：支持重试、超时、参数验证的任务执行框架

### 1.3 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design + Zustand |
| 后端 | Python + FastAPI + SQLAlchemy |
| 数据库 | PostgreSQL + pgvector 扩展 |
| AI模型 | Ollama (BGE-M3/qwen3) |
| 部署 | Uvicorn + 静态文件服务 |

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端层 (Frontend)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  ChatPage   │  │ ContentList │  │ ContentList │  │ ContentList │        │
│  │  (对话页)   │  │Page (图片)  │  │Page (视频)  │  │Page (文档)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                        │
│                           ┌────────┴────────┐                              │
│                           │   API Services  │                              │
│                           │  (api.ts)       │                              │
│                           └────────┬────────┘                              │
│                                    │                                        │
│                           ┌────────┴────────┐                              │
│                           │  Unified Store  │                              │
│                           │  (appStore.ts)  │                              │
│                           └─────────────────┘                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTP/REST
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              后端层 (Backend)                                │
│                                    │                                        │
│  ┌─────────────────────────────────┴─────────────────────────────────┐     │
│  │                         FastAPI Application                        │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │     │
│  │  │/api/conte│ │/api/chat │ │/api/agent│ │/api/skil │ │/api/tasks│ │     │
│  │  │  nts/*   │ │   /*     │ │   /*     │ │   ls/*   │ │   /*     │ │     │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │     │
│  └───────┼────────────┼────────────┼────────────┼────────────┼───────┘     │
│          │            │            │            │            │             │
│  ┌───────┴────────────┴────────────┴────────────┴────────────┴───────┐     │
│  │                      Unified Response Layer                        │     │
│  │                    (APIResponse / APIException)                    │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│          │                                                                 │
│  ┌───────┴───────────────────────────────────────────────────────────┐     │
│  │                         Service Layer                              │     │
│  │  ┌─────────────────────────────────────────────────────────────┐ │     │
│  │  │                    BaseService (基类)                        │ │     │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│ │     │
│  │  │  │ContentService│  │DocumentServic│  │   OllamaClient       ││ │     │
│  │  │  │              │  │     e        │  │  (LLM/Embedding)     ││ │     │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────┘│ │     │
│  │  └─────────────────────────────────────────────────────────────┘ │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                    │                                        │
│  ┌─────────────────────────────────┴─────────────────────────────────┐     │
│  │                         Core Layer                                 │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │     │
│  │  │  Config  │  │ Database │  │TaskEngine│  │Response │  │ErrorHand │ │     │
│  │  │          │  │ (SQLAlch │  │ (统一任务 │  │ (统一响应│  │  ler     │ │     │
│  │  └──────────┘  │  emy)    │  │  执行)   │  │  格式)   │  └──────────┘ │     │
│  │                └────┬─────┘  └──────────┘  └──────────┘             │     │
│  └─────────────────────┼─────────────────────────────────────────────────┘     │
│                        │                                                      │
│  ┌─────────────────────┴─────────────────────────────────────────────────┐     │
│  │                         Agent Layer                                  │     │
│  │  ┌──────────────────┐    ┌─────────────────────────────────────────┐ │     │
│  │  │   AgentEngine    │───▶│  Skill Registry                         │ │     │
│  │  │  (任务规划/执行)  │    │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │ │     │
│  │  └──────────────────┘    │  │content_e│ │vector_se│ │llm_chat │   │ │     │
│  │                          │  │xtract   │ │arch     │ │         │   │ │     │
│  │                          │  └─────────┘ └─────────┘ └─────────┘   │ │     │
│  │                          │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │ │     │
│  │                          │  │image_an │ │video_an │ │text_embe│   │ │     │
│  │                          │  │alyze    │ │alyze    │ │d        │   │ │     │
│  │                          │  └─────────┘ └─────────┘ └─────────┘   │ │     │
│  │                          └─────────────────────────────────────────┘ │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据层 (Data)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PostgreSQL + pgvector                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │ contents │  │content_ch│  │video_fra │  │conversati│            │   │
│  │  │          │  │  unks    │  │  mes     │  │  ons     │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │   │
│  │  │ documents│  │  images  │  │knowledge_│                          │   │
│  │  │(legacy)  │  │(legacy)  │  │  bases   │                          │   │
│  │  └──────────┘  └──────────┘  └──────────┘                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 分层架构说明

#### 2.2.1 API层 (app/api/) - 精简为5个核心路由

负责HTTP请求处理和路由分发：

| 文件 | 功能 | 主要端点 |
|------|------|----------|
| `contents.py` | **统一内容管理** | POST /api/contents/upload, GET /api/contents/, POST /api/contents/search, GET /api/contents/{id}, DELETE /api/contents/{id} |
| `chat.py` | 对话API | POST /api/chat, POST /api/chat/stream, GET /api/chat/history/{session_id} |
| `agent.py` | Agent执行API | POST /api/agent/execute, POST /api/agent/execute/stream, GET /api/agent/task/{task_id} |
| `skills.py` | Skill管理API | GET /api/skills/, POST /api/skills/invoke/{skill_name} |
| `tasks.py` | 任务管理 | GET /api/tasks/running, GET /api/tasks/{task_id} |

**已移除的路由（整合到contents）：**
- `documents.py` → 整合到 `/api/contents/documents/*`
- `images.py` → 整合到 `/api/contents/images/*`

#### 2.2.2 服务层 (app/services/)

业务逻辑实现，基于 **BaseService** 基类：

- **base_service.py**: BaseService基类，提供通用CRUD和向量搜索
- **content_service.py**: 内容服务，继承BaseService
- **chat_service.py**: 对话服务，处理RAG检索和LLM生成
- **document_service.py**: 文档处理服务
- **ollama_client.py**: Ollama LLM客户端

#### 2.2.3 核心层 (app/core/)

基础设施和通用功能：

- **config.py**: 配置管理（Pydantic Settings）
- **database.py**: 数据库连接和会话管理
- **task_engine.py**: **统一任务执行引擎** - 支持重试、超时、参数验证
- **response.py**: **统一API响应格式** - 标准化成功/错误响应
- **base_service.py**: **BaseService基类** - 通用CRUD和向量搜索
- **error_handlers.py**: 全局错误处理
- **middleware.py**: 请求日志和异常处理中间件

#### 2.2.4 数据层 (app/models/)

数据模型定义：

- **content_models.py**: 统一内容模型（Content, ContentChunk, VideoFrame）
- **database_models.py**: 旧版模型（Document, Image, Conversation, KnowledgeBase）
- **schemas.py**: Pydantic请求/响应模型

#### 2.2.5 Agent层 (app/agent/)

智能体引擎：

- **engine.py**: Agent执行引擎，负责任务规划和技能编排
- **prompts/system.md**: 系统提示词

#### 2.2.6 Skill层 (app/skills/)

技能系统：

- **base.py**: Skill基类和注册器
- **builtins.py**: 6个内置Skill实现
- **loader.py**: Markdown Skill加载器
- **registry.py**: Skill注册表管理

---

## 三、核心模块详解

### 3.1 BaseService - 基础服务类

BaseService 提供通用的CRUD操作和向量搜索功能，所有业务服务应继承此类。

```python
class BaseService(Generic[T], ABC):
    """
    基础服务抽象基类
    
    提供通用的CRUD操作和向量搜索功能
    子类需要实现:
    - model_class: 数据模型类
    - embedding_column: 向量字段名（用于向量搜索）
    """
    
    model_class: Type[T] = None
    embedding_column: str = "embedding"
    default_vector_dimension: int = 1024
```

#### 3.1.1 CRUD 操作

| 方法 | 功能 | 返回值 |
|------|------|--------|
| `get_by_id(id)` | 通过ID获取记录 | Optional[T] |
| `get_or_404(id)` | 获取记录，不存在则抛出NotFoundError | T |
| `get(id)` | 获取记录（带ServiceResponse包装） | ServiceResponse |
| `list(skip, limit, filters)` | 列表查询 | ServiceResponse |
| `create(obj_data)` | 创建记录 | ServiceResponse |
| `update(id, obj_data)` | 更新记录 | ServiceResponse |
| `delete(id)` | 删除记录 | ServiceResponse |
| `bulk_create(items)` | 批量创建 | ServiceResponse |

#### 3.1.2 向量搜索

| 方法 | 功能 | 参数 |
|------|------|------|
| `search(query)` | 语义搜索 | query: 查询文本 |
| `vector_search(query_embedding)` | 向量搜索 | query_embedding: 查询向量 |
| `generate_and_save_embedding(id, text)` | 生成并保存向量 | id: 记录ID, text: 文本 |

#### 3.1.3 使用示例

```python
from app.core.base_service import BaseService, ServiceResponse
from app.models.content_models import Content

class ContentService(BaseService[Content]):
    model_class = Content
    embedding_column = "embedding"
    
    def _prepare_create_data(self, data: Dict) -> Dict:
        """预处理创建数据 - 子类可重写"""
        data["created_at"] = datetime.now()
        return data

# 使用
service = ContentService(db)
response: ServiceResponse = service.create({"title": "示例"})
if response.success:
    print(response.data)
```

### 3.2 统一任务执行引擎 (TaskExecutionEngine)

提供统一的任务执行流程，包括参数验证、超时控制、自动重试、执行日志。

```python
class TaskExecutionEngine:
    """
    统一任务执行引擎
    
    提供统一的任务执行流程，包括：
    - 参数验证
    - 同步/异步执行支持
    - 超时控制
    - 自动重试
    - 执行日志
    - 结果处理
    """
```

#### 3.2.1 TaskResult - 统一任务结果

```python
@dataclass
class TaskResult:
    success: bool
    data: Any = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    execution_time: float = 0.0
    retry_count: int = 0
    status: TaskStatus
    metadata: Dict[str, Any]
    timestamp: datetime
    traceback_info: Optional[str] = None
```

#### 3.2.2 ExecutionConfig - 执行配置

```python
@dataclass
class ExecutionConfig:
    timeout: Optional[float] = None          # 超时设置（秒）
    max_retries: int = 0                     # 最大重试次数
    retry_delay: float = 1.0                 # 重试间隔（秒）
    retry_backoff: float = 2.0               # 指数退避倍数
    retry_exceptions: tuple = (Exception,)   # 需要重试的异常类型
    validate_params: bool = True             # 是否验证参数
    log_execution: bool = True               # 是否记录执行日志
```

#### 3.2.3 使用示例

```python
from app.core.task_engine import task_engine, create_task_context, create_execution_config

# 创建任务上下文
context = create_task_context(
    task_name="内容分析",
    task_type="skill",
    params={"file_path": "/path/to/file"}
)

# 创建执行配置
config = create_execution_config(
    timeout=30.0,           # 30秒超时
    max_retries=3,          # 最多重试3次
    retry_delay=1.0         # 每次重试间隔1秒
)

# 执行任务
result = await task_engine.execute(
    func=analyze_content,
    context=context,
    config=config,
    file_path="/path/to/file"
)

if result.success:
    print(f"执行成功: {result.data}")
else:
    print(f"执行失败: {result.error}")
```

### 3.3 统一API响应格式

#### 3.3.1 成功响应格式

```json
{
    "success": true,
    "data": { ... },
    "message": "操作成功",
    "timestamp": "2024-01-01T12:00:00"
}
```

#### 3.3.2 分页响应格式

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

#### 3.3.3 错误响应格式

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

#### 3.3.4 错误码列表

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 1000 | 未知错误 | 500 |
| 1001 | 参数无效 | 400 |
| 1002 | 缺少必要参数 | 400 |
| 2000 | 未授权访问 | 401 |
| 3000 | 资源不存在 | 404 |
| 3001 | 资源已存在 | 409 |
| 4000 | 数据库错误 | 500 |
| 5000 | 业务逻辑错误 | 422 |
| 6000 | 外部服务错误 | 502 |
| 6001 | Ollama服务错误 | 502 |
| 7000 | 任务执行错误 | 500 |
| 7001 | 任务执行超时 | 504 |

#### 3.3.5 使用示例

```python
from app.core.response import APIResponse, ErrorCode, APIException

# 成功响应
@app.get("/items/{id}")
async def get_item(id: str):
    item = await fetch_item(id)
    if not item:
        return APIResponse.not_found("项目")
    return APIResponse.success(data=item)

# 分页响应
@app.get("/items")
async def list_items(page: int = 1, page_size: int = 10):
    items, total = await fetch_items(page, page_size)
    return APIResponse.paginated(items, total, page, page_size)

# 错误响应
@app.post("/items")
async def create_item(data: ItemCreate):
    if not data.name:
        return APIResponse.validation_error("名称不能为空")
    # ...

# 抛出异常
@app.delete("/items/{id}")
async def delete_item(id: str):
    if not await item_exists(id):
        raise APIException(
            error="项目不存在",
            code=ErrorCode.RESOURCE_NOT_FOUND
        )
```

### 3.4 统一内容模型

#### 3.4.1 Content 模型

```python
class Content(Base):
    """统一内容模型 - 支持文本、图片、视频、音频"""
    
    id = Column(UUID, primary_key=True)
    content_type = Column(Enum(ContentType))  # TEXT/IMAGE/VIDEO/AUDIO
    source_path = Column(String)              # 文件存储路径
    original_name = Column(String)            # 原始文件名
    file_size = Column(Integer)
    mime_type = Column(String)
    
    # 内容提取
    extracted_text = Column(Text)             # 文档提取的文本
    description = Column(Text)                # 图片/视频描述
    
    # 向量嵌入 (1024维 BGE-M3)
    embedding = Column(Vector(1024))
    
    # 元数据
    content_metadata = Column(JSONB)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
```

#### 3.4.2 内容分块 (ContentChunk)

长文档自动分块存储，支持更精确的向量检索：

```python
class ContentChunk(Base):
    content_id = Column(UUID, ForeignKey)
    chunk_index = Column(Integer)      # 分块序号
    chunk_text = Column(Text)          # 分块文本
    embedding = Column(Vector(1024))   # 分块向量
```

#### 3.4.3 视频帧 (VideoFrame)

视频内容的关键帧提取和分析：

```python
class VideoFrame(Base):
    content_id = Column(UUID, ForeignKey)
    frame_path = Column(String)        # 帧图片路径
    timestamp = Column(Float)          # 时间戳（秒）
    frame_number = Column(Integer)     # 帧序号
    description = Column(Text)         # 帧描述
    description_embedding = Column(Vector(1024))
```

### 3.5 Skill系统

#### 3.5.1 Skill基类

```python
class Skill(ABC):
    """Skill基类 - 所有技能必须继承"""
    
    @abstractmethod
    def _define_metadata(self) -> SkillMetadata:
        """定义Skill元数据（名称、描述、参数等）"""
        pass
    
    @abstractmethod
    async def execute(self, **params) -> SkillResult:
        """执行Skill的核心逻辑"""
        pass
    
    async def run(self, **params) -> SkillResult:
        """运行Skill（带参数验证和计时）"""
        # 1. 验证参数
        # 2. 执行execute
        # 3. 记录执行时间
        # 4. 返回结果
```

#### 3.5.2 内置Skills

| Skill名称 | 功能 | 参数 |
|-----------|------|------|
| `content_extract` | 提取文档/分析图片/分析视频 | `file_path: str` |
| `image_analyze` | 使用视觉模型分析图片 | `image_path: str, prompt: str` |
| `video_analyze` | 提取关键帧并分析视频 | `video_path: str, max_frames: int` |
| `text_embed` | 文本向量化 | `text: str` |
| `vector_search` | 语义搜索 | `query: str, content_type: str, top_k: int` |
| `llm_chat` | LLM对话 | `message: str, system_prompt: str, context: list` |

#### 3.5.3 Skill注册器

```python
class SkillRegistry:
    """Skill注册器 - 单例模式"""
    
    def register(self, skill: Skill):
        """注册Skill"""
        
    def get(self, name: str) -> Optional[Skill]:
        """获取Skill"""
        
    def list_skills(self) -> List[Dict]:
        """列出所有Skills"""
        
    async def invoke(self, name: str, **params) -> SkillResult:
        """调用Skill"""

# 全局实例
skill_registry = SkillRegistry()
```

### 3.6 Agent引擎

#### 3.6.1 任务规划

Agent使用LLM分析任务并规划执行步骤：

```python
async def plan_task(self, description: str, context: Dict) -> List[AgentStep]:
    """
    1. 获取可用Skills列表
    2. 构建规划Prompt
    3. 调用LLM生成执行计划
    4. 解析JSON格式的步骤列表
    5. 返回AgentStep列表
    """
```

#### 3.6.2 任务执行

```python
async def execute_task(self, task_id: str, description: str, context: Dict):
    """
    执行流程：
    1. 创建任务并标记为running
    2. 调用plan_task规划步骤
    3. 遍历执行每个步骤：
       - 处理文件路径参数
       - 调用对应的Skill
       - 记录执行结果
       - 流式返回进度
    4. 生成最终结果
    5. 标记任务为completed/failed
    """
```

#### 3.6.3 文件路径自动解析

Agent自动处理文件名到完整路径的映射：

```python
def _process_file_params(self, params: Dict) -> Dict:
    """
    自动在上传目录中查找文件：
    - uploads/images/
    - uploads/contents/
    - uploads/documents/
    
    支持递归查找子目录
    """
```

### 3.7 Ollama客户端

封装Ollama API调用：

```python
class OllamaClient:
    """Ollama LLM客户端"""
    
    # 配置
    base_url: str = "http://localhost:11434"
    embedding_model: str = "bge-m3:latest"      # 1024维向量
    chat_model: str = "qwen3:0.6b"              # 对话模型
    vision_model: str = "qwen3:0.6b"            # 视觉模型
    
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """文本向量化"""
        
    async def chat(self, messages: List[Dict], stream: bool = True):
        """对话生成"""
        
    async def describe_image(self, image_path: str) -> str:
        """图像描述"""
```

---

## 四、前端架构

### 4.1 项目结构

```
frontend/src/
├── components/           # UI组件
│   ├── ChatMessage.tsx   # 聊天消息组件
│   ├── ChatInput.tsx     # 聊天输入组件
│   ├── DockNavigation.tsx # Dock导航栏
│   ├── Sidebar.tsx       # 侧边栏
│   ├── ContentListPage.tsx # 统一内容列表页（可复用）
│   └── UnifiedTaskMonitor.tsx # 任务监控
├── pages/               # 页面组件
│   ├── ChatPage.tsx      # 对话页面（核心）
│   ├── ContentListPage.tsx # 统一内容列表页
│   ├── ImagesPage.tsx    # 图片库（使用ContentListPage）
│   ├── VideosPage.tsx    # 视频库（使用ContentListPage）
│   └── DocumentsPage.tsx # 文档库（使用ContentListPage）
├── services/            # API服务
│   └── api.ts           # 统一API封装
├── stores/              # 状态管理（Zustand）
│   ├── appStore.ts      # **统一应用状态（推荐）**
│   ├── chatStore.ts     # 聊天状态（向后兼容）
│   └── uploadStore.ts   # 上传状态（向后兼容）
├── types/               # TypeScript类型
│   └── index.ts
├── App.tsx              # 应用入口
└── index.tsx            # 渲染入口
```

### 4.2 状态管理 - 统一 AppStore

#### 4.2.1 AppStore 结构

```typescript
interface AppStoreState extends ChatState, UploadState {
  // UI 状态
  ui: UIState;
  // 用户状态
  user: UserState;

  // Chat Actions
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => void;
  // ... 其他actions

  // Upload Actions
  addUploadTask: (task: ...) => string;
  updateUploadProgress: (id: string, percent: number) => void;
  // ... 其他actions

  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  // ... 其他actions

  // User Actions
  setUser: (userId: string, userName: string) => void;
  // ... 其他actions
}
```

#### 4.2.2 使用方式

```typescript
// 1. 新项目推荐 - 使用统一 Store
const { messages, sendMessage } = useAppStore();

// 2. 性能优化 - 使用选择器 (防止不必要的重渲染)
const { messages } = useChatState();
const { sendMessage } = useChatActions();

// 3. 只获取单个状态 (最佳性能)
const messages = useAppStore(state => state.messages);
const sendMessage = useAppStore(state => state.sendMessage);

// 4. 向后兼容 (旧代码无需修改)
const { messages, sendMessage } = useChatStore();
const { tasks, addTask } = useUploadStore();
```

### 4.3 ContentListPage - 统一内容列表组件

ContentListPage 是一个高度可复用的组件，用于展示图片、视频、文档等内容列表。

#### 4.3.1 Props 接口

```typescript
interface ContentListPageProps {
  contentType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'ALL';
  title: string;
  icon: React.ReactNode;
  uploadAccept: string;
  uploadButtonText: string;
  emptyText: string;
  showPreview?: boolean;
  showSearch?: boolean;
  analyzingText?: string;
  analyzingDuration?: number;
  renderCardContent?: (item: ContentListItem) => React.ReactNode;
  renderCardCover?: (item: ContentListItem, handlers: {...}) => React.ReactNode;
  renderDetailContent?: (item: ContentListItem) => React.ReactNode;
}
```

#### 4.3.2 使用示例

```typescript
// ImagesPage.tsx
const ImagesPage: React.FC = () => (
  <ContentListPage
    contentType="IMAGE"
    title="图片库"
    icon={<PictureOutlined />}
    uploadAccept="image/*"
    uploadButtonText="上传图片"
    emptyText="暂无图片"
  />
);

// VideosPage.tsx
const VideosPage: React.FC = () => (
  <ContentListPage
    contentType="VIDEO"
    title="视频库"
    icon={<VideoCameraOutlined />}
    uploadAccept="video/*"
    uploadButtonText="上传视频"
    emptyText="暂无视频"
    analyzingText="AI分析视频中..."
    analyzingDuration={5000}
  />
);
```

### 4.4 API服务封装

统一封装所有后端API：

```typescript
// api.ts
export const contentApi = {
  uploadContent: (file: File, metadata?: any, onProgress?: (p: number) => void) => Promise<...>;
  listContents: (contentType?: string, skip?: number, limit?: number) => Promise<...>;
  searchContents: (query: string, contentType?: string, topK?: number) => Promise<...>;
  getContentDetail: (id: string) => Promise<...>;
  deleteContent: (id: string) => Promise<...>;
};

export const chatApi = { ... };
export const skillApi = { ... };
export const agentApi = { ... };
```

---

## 五、数据流

### 5.1 内容上传流程

```
用户选择文件
    │
    ▼
前端上传文件 ──▶ 后端接收文件
    │              │
    │              ▼
    │         保存到 uploads/contents/
    │              │
    │              ▼
    │         根据文件类型处理：
    │         ├─ 文档：提取文本
    │         ├─ 图片：生成描述
    │         └─ 视频：提取关键帧
    │              │
    │              ▼
    │         生成向量嵌入 (BGE-M3)
    │              │
    │              ▼
    │         保存到数据库 (contents表)
    │              │
    └──────────────┘
                   ▼
              返回统一响应格式
```

### 5.2 RAG对话流程

```
用户输入问题
    │
    ▼
生成查询向量 (BGE-M3)
    │
    ▼
向量相似度搜索 (pgvector)
    │
    ▼
获取Top-K相关文档
    │
    ▼
构建增强Prompt：
"基于以下上下文回答问题：
[检索到的文档内容]

用户问题：[问题]"
    │
    ▼
调用LLM生成回答
    │
    ▼
流式返回统一响应格式
```

### 5.3 Agent执行流程

```
用户输入任务
    │
    ▼
AgentEngine.plan_task()
    │
    ▼
构建规划Prompt（包含可用Skills）
    │
    ▼
LLM生成执行计划（JSON格式）
    │
    ▼
解析步骤列表
    │
    ▼
遍历执行每个步骤（通过TaskExecutionEngine）：
┌─────────────────────────────┐
│ 步骤1: content_extract      │
│ 参数: {file_path: "xxx.pdf"} │
│ 结果: TaskResult            │
├─────────────────────────────┤
│ 步骤2: vector_search         │
│ 参数: {query: "..."}         │
│ 结果: TaskResult            │
├─────────────────────────────┤
│ 步骤3: llm_chat              │
│ 参数: {message: "..."}       │
│ 结果: TaskResult            │
└─────────────────────────────┘
    │
    ▼
生成最终结果并返回统一响应格式
```

---

## 六、配置说明

### 6.1 后端配置 (.env)

```env
# 数据库
DATABASE_URL=postgresql://postgres:password@localhost:5432/multimodal_rag

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=bge-m3:latest
OLLAMA_CHAT_MODEL=qwen3:0.6b
OLLAMA_VISION_MODEL=qwen3:0.6b

# 应用
APP_HOST=0.0.0.0
APP_PORT=8000
DEBUG=true

# 向量设置
VECTOR_DIMENSION=1024
TOP_K_RETRIEVAL=5
SIMILARITY_THRESHOLD=0.7
```

### 6.2 前端配置

```typescript
// 环境变量
REACT_APP_API_URL=http://localhost:8000
```

---

## 七、部署架构

### 7.1 开发环境

```yaml
# docker-compose.yml (建议)
services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_DB: multimodal_rag
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
  
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama:/root/.ollama
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - ollama
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### 7.2 生产环境

- 使用 Gunicorn + Uvicorn 部署后端
- 使用 Nginx 作为反向代理和静态文件服务
- PostgreSQL 主从复制
- 可选：Redis 缓存

---

## 八、扩展指南

### 8.1 添加新服务（继承BaseService）

```python
from app.core.base_service import BaseService, ServiceResponse
from app.models.content_models import Content

class MyContentService(BaseService[Content]):
    model_class = Content
    embedding_column = "embedding"
    
    def _prepare_create_data(self, data: Dict) -> Dict:
        """预处理创建数据"""
        data["created_at"] = datetime.now()
        return data
    
    async def custom_search(self, query: str) -> ServiceResponse:
        """自定义搜索方法"""
        # 实现自定义逻辑
        return ServiceResponse.ok(data=results)
```

### 8.2 添加新Skill

1. 在 `app/skills/builtins.py` 中创建新Skill类：

```python
class MyNewSkill(Skill):
    def _define_metadata(self) -> SkillMetadata:
        return SkillMetadata(
            name="my_new_skill",
            description="Skill描述",
            parameters=[
                SkillParameter(
                    name="param1",
                    type="string",
                    description="参数说明",
                    required=True
                ),
            ],
            return_type="string",
            tags=["custom"]
        )
    
    async def execute(self, param1: str) -> SkillResult:
        try:
            # 实现逻辑
            result = await do_something(param1)
            return SkillResult(success=True, data=result)
        except Exception as e:
            return SkillResult(success=False, error=str(e))
```

2. 在 `register_builtin_skills()` 中注册：

```python
def register_builtin_skills():
    # ... 其他skills
    skill_registry.register(MyNewSkill())
```

### 8.3 前端添加新内容类型页面

使用 ContentListPage 组件快速创建新页面：

```typescript
// NewContentPage.tsx
import React from 'react';
import { SomeIcon } from '@ant-design/icons';
import ContentListPage from './ContentListPage';

const NewContentPage: React.FC = () => (
  <ContentListPage
    contentType="ALL"
    title="新内容类型"
    icon={<SomeIcon />}
    uploadAccept="*/*"
    uploadButtonText="上传文件"
    emptyText="暂无内容"
    renderCardContent={(item) => (
      <div>自定义卡片内容</div>
    )}
  />
);

export default NewContentPage;
```

---

## 九、性能优化

### 9.1 数据库优化

- 向量索引：使用 IVFFlat 索引加速相似度搜索
- 复合索引：`content_type + created_at`
- 连接池：SQLAlchemy 连接池配置

### 9.2 缓存策略

- 向量嵌入缓存（可选Redis）
- 文件解析结果缓存
- LLM响应缓存（短期）

### 9.3 异步处理

- 文件上传使用异步处理
- 视频处理使用后台任务
- 大文件分片上传

---

## 十、安全考虑

### 10.1 文件上传安全

- 文件类型白名单验证
- 文件大小限制
- 文件名安全处理
- 存储路径隔离

### 10.2 API安全

- CORS配置
- 请求频率限制（待实现）
- 输入验证（Pydantic）
- 统一错误处理（不暴露敏感信息）

### 10.3 数据安全

- 数据库连接加密
- 敏感信息环境变量管理
- 定期备份策略

---

## 附录

### A. 数据库表结构

```sql
-- 统一内容表
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type contenttype NOT NULL,
    source_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type VARCHAR(100),
    extracted_text TEXT,
    description TEXT,
    embedding vector(1024),
    content_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 向量索引
CREATE INDEX idx_content_embedding ON contents 
USING ivfflat (embedding vector_cosine_ops);
```

### B. API端点汇总（精简后）

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/contents/upload | 上传内容 |
| GET | /api/contents/ | 列出内容 |
| POST | /api/contents/search | 搜索内容 |
| GET | /api/contents/{id} | 获取内容详情 |
| DELETE | /api/contents/{id} | 删除内容 |
| GET | /api/skills/ | 列出Skills |
| POST | /api/skills/invoke/{skill_name} | 调用Skill |
| POST | /api/agent/execute | 执行Agent任务 |
| POST | /api/agent/execute/stream | 流式执行 |
| GET | /api/agent/task/{task_id} | 获取任务状态 |
| POST | /api/chat | 对话 |
| POST | /api/chat/stream | 流式对话 |
| GET | /api/tasks/running | 获取运行中任务 |

---

*文档版本: 2.0*  
*更新日期: 2026-03-04*
