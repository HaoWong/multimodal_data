# 多模态 RAG 系统架构文档

## 1. 系统概览

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ ChatPage │  │Documents │  │  Images  │  │ Sidebar  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       └─────────────┴─────────────┴─────────────┘            │
│                         │                                    │
│                    ┌────┴────┐                               │
│                    │ useChat │                               │
│                    └────┬────┘                               │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────┼───────────────────────────────────┐
│                    后端 (FastAPI)                            │
│  ┌──────────────────────┴────────────────────────┐          │
│  │              API 层 (/api)                     │          │
│  │  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────┐      │          │
│  │  │ /chat│ │/docs │ │/images │ │/agent│      │          │
│  │  └──┬───┘ └──┬───┘ └───┬────┘ └──┬───┘      │          │
│  └─────┼────────┼─────────┼─────────┼──────────┘          │
│        └────────┴─────────┴─────────┘                      │
│                      │                                      │
│  ┌───────────────────┴──────────────────┐                 │
│  │           Service 层                  │                 │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ │                 │
│  │  │ChatSvc  │ │DocSvc    │ │Ollama  │ │                 │
│  │  └────┬────┘ └────┬─────┘ └───┬────┘ │                 │
│  └───────┼───────────┼───────────┼──────┘                 │
│          └───────────┴───────────┘                        │
│  ┌────────────────────────────────────┐                   │
│  │         Core 层 (基础设施)          │                   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ │                   │
│  │  │Database│ │Config  │ │BaseSvc │ │                   │
│  │  └────────┘ └────────┘ └────────┘ │                   │
│  └────────────────────────────────────┘                   │
└───────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  PostgreSQL│
                    │  + pgvector│
                    └───────────┘
```

## 2. 核心架构原则

### 2.1 DRY (Don't Repeat Yourself)
- **BaseService**: 通用 CRUD 操作抽象
- **stream_utils**: 流式响应统一包装
- **useChat Hook**: 前端聊天逻辑复用

### 2.2 单一职责
- 每个服务只负责一个业务领域
- 每个 API 只处理一种资源
- 每个 Hook 只管理一类状态

### 2.3 依赖注入
- 使用 FastAPI 的 `Depends` 注入服务
- 便于测试和替换实现

## 3. 后端架构

### 3.1 目录结构

```
backend/app/
├── api/              # API 路由层
│   ├── chat.py       # 对话接口
│   ├── contents.py   # 内容管理
│   └── ...
├── core/             # 核心基础设施
│   ├── base_service.py   # 基础服务类
│   ├── stream_utils.py   # 流式工具
│   ├── database.py       # 数据库连接
│   └── config.py         # 配置管理
├── models/           # 数据模型
│   ├── content_models.py
│   ├── database_models.py
│   └── schemas.py        # Pydantic 模型
├── services/         # 业务服务层
│   ├── chat_service.py
│   ├── document_service.py
│   └── ollama_client.py
└── skills/           # Skill 系统
    ├── base.py
    └── builtins.py
```

### 3.2 核心抽象

#### BaseService
```python
class BaseService(Generic[T]):
    """通用 CRUD 服务基类"""
    def __init__(self, db: Session, model: type[T])
    def get(self, id: str) -> Optional[T]
    def list(self, skip: int, limit: int) -> List[T]
    def create(self, **kwargs) -> T
    def delete(self, id: str) -> bool
```

#### Stream Utils
```python
async def stream_json_response(
    generator: AsyncGenerator[str, None],
    key: str = "chunk"
) -> AsyncGenerator[str, None]
```

### 3.3 服务层设计

#### ChatService
- **职责**: 处理对话逻辑
- **核心方法**:
  - `chat()`: 非流式对话
  - `chat_stream()`: 流式对话
  - `_prepare_chat()`: 公共准备逻辑
  - `_retrieve_context()`: RAG 检索
  - `_build_messages()`: 消息构建

## 4. 前端架构

### 4.1 目录结构

```
frontend/src/
├── components/       # UI 组件
│   ├── ChatInput.tsx
│   ├── ChatMessage.tsx
│   └── Sidebar.tsx
├── hooks/            # 自定义 Hooks
│   └── useChat.ts    # 聊天逻辑 Hook
├── pages/            # 页面组件
│   ├── ChatPage.tsx
│   ├── DocumentsPage.tsx
│   └── ImagesPage.tsx
├── services/         # API 服务
│   └── api.ts
├── stores/           # 状态管理
│   └── chatStore.ts
└── types/            # TypeScript 类型
    └── index.ts
```

### 4.2 核心 Hook

#### useChat
```typescript
function useChat(options: UseChatOptions) {
  messages: ChatMessage[];
  isLoading: boolean;
  currentSessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}
```

## 5. 数据流

### 5.1 对话流程

```
用户输入
   ↓
useChat.sendMessage()
   ↓
API: POST /chat/stream
   ↓
ChatService.chat_stream()
   ↓
  ├─ RAG 检索 (可选)
  ├─ 加载历史
  ├─ 构建 Prompt
  └─ 调用 LLM
   ↓
流式返回
   ↓
更新 UI
```

### 5.2 文件上传流程

```
选择文件
   ↓
ContentExtract Skill
   ↓
  ├─ 文本提取
  ├─ 图片分析
  └─ 视频处理
   ↓
生成 Embedding
   ↓
存入 PostgreSQL
```

## 6. 关键技术决策

### 6.1 为什么选择 FastAPI + React?
- FastAPI: 自动文档、类型提示、异步支持
- React: 组件化、Hooks、生态丰富

### 6.2 为什么使用 PostgreSQL + pgvector?
- 关系型数据 + 向量搜索一体化
- 事务支持、ACID 特性

### 6.3 为什么抽象 BaseService?
- 减少重复代码
- 统一错误处理
- 便于扩展新资源

## 7. 扩展指南

### 7.1 添加新资源

1. 创建模型
```python
# models/my_resource.py
class MyResource(Base):
    __tablename__ = "my_resources"
    id = Column(UUID, primary_key=True)
    name = Column(String)
```

2. 创建服务
```python
# services/my_resource_service.py
class MyResourceService(BaseService[MyResource]):
    def __init__(self, db: Session):
        super().__init__(db, MyResource)
```

3. 创建 API
```python
# api/my_resource.py
@router.get("/")
def list_resources(service: MyResourceService = Depends(get_service)):
    return service.list()
```

### 7.2 添加新 Skill

```python
class MySkill(Skill):
    def _define_metadata(self) -> SkillMetadata:
        return SkillMetadata(name="my_skill", ...)
    
    async def execute(self, param: str) -> SkillResult:
        return SkillResult(success=True, data=result)
```

## 8. 性能优化

### 8.1 后端优化
- 数据库连接池
- 向量索引 (IVFFlat)
- 异步处理

### 8.2 前端优化
- 虚拟滚动 (大量消息)
- 防抖输入
- 懒加载组件

## 9. 部署架构

```
┌─────────────────────────────────────┐
│           Nginx / CDN               │
└─────────────┬───────────────────────┘
              │
┌─────────────┴───────────────────────┐
│        Docker Compose               │
│  ┌─────────┐  ┌─────────┐          │
│  │  Backend│  │ Frontend│          │
│  │  :8000  │  │  :3000  │          │
│  └────┬────┘  └─────────┘          │
│       │                             │
│  ┌────┴────┐  ┌─────────┐          │
│  │PostgreSQL│  │ Ollama  │          │
│  │  :5432  │  │  :11434 │          │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘
```

## 10. 监控与日志

- 使用 SQLAlchemy 日志记录 SQL
- API 请求/响应日志
- 错误追踪

---

**版本**: 1.0  
**最后更新**: 2026-03-02
