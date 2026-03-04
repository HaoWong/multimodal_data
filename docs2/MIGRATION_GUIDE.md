# 迁移指南

本文档指导开发者从旧版本迁移到新架构。

## 目录

1. [API端点迁移](#api端点迁移)
2. [前端Store迁移](#前端store迁移)
3. [组件使用迁移](#组件使用迁移)
4. [后端服务迁移](#后端服务迁移)
5. [常见问题](#常见问题)

---

## API端点迁移

### 1. 端点整合概览

旧版本的分散端点已整合为统一的 `contents` 端点：

| 旧端点 | 新端点 | 状态 |
|--------|--------|------|
| `POST /api/documents/upload` | `POST /api/contents/upload` | 迁移 |
| `GET /api/documents/` | `GET /api/contents/?content_type=DOCUMENT` | 迁移 |
| `POST /api/documents/search` | `POST /api/contents/search` | 迁移 |
| `POST /api/images/upload` | `POST /api/contents/upload` | 迁移 |
| `GET /api/images/` | `GET /api/contents/?content_type=IMAGE` | 迁移 |
| `GET /api/images/{id}` | `GET /api/contents/{id}` | 迁移 |
| `DELETE /api/images/{id}` | `DELETE /api/contents/{id}` | 迁移 |

### 2. 上传文件

#### 旧代码
```typescript
// 上传文档
await documentApi.uploadFile(file, onProgress);

// 上传图片
await imageApi.uploadImage(file, onProgress);
```

#### 新代码
```typescript
// 统一上传接口
await contentApi.uploadContent(file, { content_type: 'DOCUMENT' }, onProgress);
await contentApi.uploadContent(file, { content_type: 'IMAGE' }, onProgress);
```

### 3. 获取列表

#### 旧代码
```typescript
// 获取文档列表
const docs = await documentApi.getDocuments();

// 获取图片列表
const images = await imageApi.listImages();
```

#### 新代码
```typescript
// 统一列表接口
const documents = await contentApi.listContents('DOCUMENT');
const images = await contentApi.listContents('IMAGE');
const videos = await contentApi.listContents('VIDEO');
const all = await contentApi.listContents(); // 获取所有类型
```

### 4. 搜索内容

#### 旧代码
```typescript
// 搜索文档
const results = await documentApi.searchDocuments(query);
```

#### 新代码
```typescript
// 统一搜索接口
const results = await contentApi.searchContents(query, 'DOCUMENT');
const results = await contentApi.searchContents(query, 'IMAGE');
const results = await contentApi.searchContents(query); // 搜索所有类型
```

### 5. 获取详情

#### 旧代码
```typescript
// 获取文档详情
const doc = await documentApi.getDocument(id);

// 获取图片详情
const image = await imageApi.getImageDetail(id);
```

#### 新代码
```typescript
// 统一详情接口
const detail = await contentApi.getContentDetail(id);
// 返回的数据结构统一为 Content 模型
```

### 6. 删除内容

#### 旧代码
```typescript
// 删除文档
await documentApi.deleteDocument(id);

// 删除图片
await imageApi.deleteImage(id);
```

#### 新代码
```typescript
// 统一删除接口
await contentApi.deleteContent(id);
```

---

## 前端Store迁移

### 1. Store整合概览

新版本推荐使用统一的 `useAppStore`，同时保持旧Store的向后兼容。

| 旧Store | 新Store | 推荐程度 |
|---------|---------|----------|
| `useChatStore` | `useAppStore` | ⭐⭐⭐ 推荐 |
| `useUploadStore` | `useAppStore` | ⭐⭐⭐ 推荐 |
| `useChatStore` | `useChatStore` | ⭐⭐ 向后兼容 |
| `useUploadStore` | `useUploadStore` | ⭐⭐ 向后兼容 |

### 2. 基本使用方式迁移

#### 旧代码
```typescript
import { useChatStore } from '../stores/chatStore';
import { useUploadStore } from '../stores/uploadStore';

const MyComponent = () => {
  const { messages, sendMessage } = useChatStore();
  const { tasks, addTask } = useUploadStore();
  
  // ...
};
```

#### 新代码（推荐）
```typescript
import { useAppStore } from '../stores';

const MyComponent = () => {
  const { messages, sendMessage, tasks, addTask } = useAppStore();
  
  // ...
};
```

### 3. 性能优化：使用选择器

为了避免不必要的重渲染，推荐使用选择器 hooks：

```typescript
import { 
  useChatState, 
  useChatActions,
  useUploadState,
  useUploadActions 
} from '../stores';

const MyComponent = () => {
  // 只订阅 Chat 状态
  const { messages, currentSessionId } = useChatState();
  
  // 只获取 Chat actions
  const { sendMessage, createNewSession } = useChatActions();
  
  // 只订阅 Upload 状态
  const { tasks } = useUploadState();
  
  // 只获取 Upload actions
  const { addTask, updateUploadProgress } = useUploadActions();
  
  // ...
};
```

### 4. 精细选择（最佳性能）

```typescript
import { useAppStore } from '../stores';

const MyComponent = () => {
  // 只获取单个状态，组件只在 messages 变化时重渲染
  const messages = useAppStore(state => state.messages);
  
  // 只获取单个 action
  const sendMessage = useAppStore(state => state.sendMessage);
  
  // ...
};
```

### 5. Store API 变化

#### UploadTask 类型变化

| 旧属性 | 新属性 | 说明 |
|--------|--------|------|
| `status: 'uploading'` | `phase: 'uploading'` | 阶段细分 |
| - | `phaseProgress: number` | 当前阶段进度 |
| - | `phase: 'analyzing'` | AI分析阶段 |

#### Actions 名称映射

| 旧Action | 新Action | 说明 |
|----------|----------|------|
| `addTask` | `addUploadTask` | 更明确的命名 |
| `completeTask` | `completeUploadTask` | 更明确的命名 |
| `failTask` | `failUploadTask` | 更明确的命名 |

---

## 组件使用迁移

### 1. 页面组件迁移

旧版本的独立页面组件已整合为统一的 `ContentListPage`。

#### 旧代码
```typescript
// ImagesPage.tsx - 旧版本
import React from 'react';
import { ImageList } from '../components/ImageList';

const ImagesPage: React.FC = () => {
  return (
    <div>
      <h1>图片库</h1>
      <ImageList />
    </div>
  );
};

// VideosPage.tsx - 旧版本
import React from 'react';
import { VideoList } from '../components/VideoList';

const VideosPage: React.FC = () => {
  return (
    <div>
      <h1>视频库</h1>
      <VideoList />
    </div>
  );
};
```

#### 新代码
```typescript
// ImagesPage.tsx - 新版本
import React from 'react';
import { PictureOutlined } from '@ant-design/icons';
import ContentListPage from '../pages/ContentListPage';

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

// VideosPage.tsx - 新版本
import React from 'react';
import { VideoCameraOutlined } from '@ant-design/icons';
import ContentListPage from '../pages/ContentListPage';

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

### 2. ContentListPage Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `contentType` | `'IMAGE' \| 'VIDEO' \| 'DOCUMENT' \| 'ALL'` | ✅ | 内容类型 |
| `title` | `string` | ✅ | 页面标题 |
| `icon` | `ReactNode` | ✅ | 标题图标 |
| `uploadAccept` | `string` | ✅ | 上传文件类型 |
| `uploadButtonText` | `string` | ✅ | 上传按钮文字 |
| `emptyText` | `string` | ✅ | 空状态提示 |
| `showPreview` | `boolean` | ❌ | 是否显示预览 |
| `showSearch` | `boolean` | ❌ | 是否显示搜索 |
| `analyzingText` | `string` | ❌ | AI分析提示文字 |
| `analyzingDuration` | `number` | ❌ | AI分析模拟时长(ms) |
| `renderCardContent` | `function` | ❌ | 自定义卡片内容 |
| `renderCardCover` | `function` | ❌ | 自定义卡片封面 |
| `renderDetailContent` | `function` | ❌ | 自定义详情内容 |

### 3. 自定义渲染示例

```typescript
import React from 'react';
import { Tag } from 'antd';
import ContentListPage from '../pages/ContentListPage';

const CustomPage: React.FC = () => (
  <ContentListPage
    contentType="DOCUMENT"
    title="自定义文档库"
    icon={<FileOutlined />}
    uploadAccept=".pdf,.doc,.docx"
    uploadButtonText="上传文档"
    emptyText="暂无文档"
    
    // 自定义卡片内容
    renderCardContent={(item) => (
      <div>
        <Tag color="blue">{item.doc_type}</Tag>
        <p>{item.content?.slice(0, 100)}...</p>
      </div>
    )}
    
    // 自定义详情内容
    renderDetailContent={(item) => (
      <div>
        <h2>{item.title}</h2>
        <pre>{item.content}</pre>
      </div>
    )}
  />
);
```

---

## 后端服务迁移

### 1. 服务层迁移到 BaseService

#### 旧代码
```python
# services/document_service.py - 旧版本
class DocumentService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_document(self, id: str) -> Optional[Document]:
        return self.db.query(Document).filter(Document.id == id).first()
    
    def list_documents(self, skip: int = 0, limit: int = 100) -> List[Document]:
        return self.db.query(Document).offset(skip).limit(limit).all()
    
    def create_document(self, data: Dict) -> Document:
        doc = Document(**data)
        self.db.add(doc)
        self.db.commit()
        return doc
```

#### 新代码
```python
# services/content_service.py - 新版本
from app.core.base_service import BaseService, ServiceResponse
from app.models.content_models import Content

class ContentService(BaseService[Content]):
    model_class = Content
    embedding_column = "embedding"
    
    def _prepare_create_data(self, data: Dict) -> Dict:
        """预处理创建数据"""
        data["created_at"] = datetime.now()
        return data
    
    async def search_by_type(
        self, 
        query: str, 
        content_type: str,
        top_k: int = 5
    ) -> ServiceResponse:
        """按类型搜索内容"""
        filters = f"AND content_type = '{content_type}'"
        return await self.search(query, top_k=top_k, extra_filters=filters)

# 使用
service = ContentService(db)
response: ServiceResponse = service.create({"title": "示例"})
if response.success:
    print(response.data)
```

### 2. 使用统一响应格式

#### 旧代码
```python
from fastapi import HTTPException

@app.get("/items/{id}")
async def get_item(id: str):
    item = await fetch_item(id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"data": item, "status": "ok"}
```

#### 新代码
```python
from app.core.response import APIResponse, ErrorCode, APIException

@app.get("/items/{id}")
async def get_item(id: str):
    item = await fetch_item(id)
    if not item:
        # 方式1: 返回错误响应
        return APIResponse.not_found("项目")
        # 方式2: 抛出异常
        raise APIException(
            error="项目不存在",
            code=ErrorCode.RESOURCE_NOT_FOUND
        )
    return APIResponse.success(data=item)
```

### 3. 使用统一任务执行引擎

#### 旧代码
```python
async def analyze_content(file_path: str):
    try:
        result = await process_file(file_path)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

#### 新代码
```python
from app.core.task_engine import task_engine, create_task_context, create_execution_config

async def analyze_content(file_path: str):
    context = create_task_context(
        task_name="内容分析",
        task_type="skill",
        params={"file_path": file_path}
    )
    
    config = create_execution_config(
        timeout=30.0,
        max_retries=3,
        retry_delay=1.0
    )
    
    result = await task_engine.execute(
        func=process_file,
        context=context,
        config=config,
        file_path=file_path
    )
    
    return result.to_dict()
```

---

## 常见问题

### Q1: 旧代码还能运行吗？

**答:** 是的，旧代码仍然可以运行。我们保持了向后兼容性：
- `useChatStore` 和 `useUploadStore` 仍然可用
- 旧的API端点仍然保留（但建议迁移到新端点）

### Q2: 如何逐步迁移？

**答:** 建议按以下顺序迁移：
1. 先迁移API调用（使用新的 `contentApi`）
2. 再迁移Store使用（使用 `useAppStore`）
3. 最后迁移页面组件（使用 `ContentListPage`）

### Q3: 新架构的优势是什么？

**答:** 
- **统一的API接口**: 减少学习成本，提高开发效率
- **统一的响应格式**: 便于错误处理和调试
- **统一的状态管理**: 减少Store之间的依赖和重复代码
- **可复用的组件**: `ContentListPage` 可用于多种内容类型
- **更好的性能**: 选择器机制避免不必要的重渲染

### Q4: 遇到兼容性问题怎么办？

**答:** 
1. 检查是否正确导入了新的API模块
2. 确认Store的初始状态是否正确
3. 查看浏览器控制台的错误信息
4. 参考本文档的代码示例进行对比

### Q5: 如何回滚到旧版本？

**答:** 如果必须回滚：
1. 恢复旧的API调用代码
2. 恢复使用旧的Store
3. 恢复旧的页面组件

但建议先尝试解决问题，因为新架构带来了显著的维护性提升。

---

## 迁移检查清单

- [ ] API调用迁移到 `contentApi`
- [ ] Store使用迁移到 `useAppStore` 或使用选择器
- [ ] 页面组件迁移到 `ContentListPage`
- [ ] 后端服务继承 `BaseService`
- [ ] API响应使用 `APIResponse`
- [ ] 任务执行使用 `TaskExecutionEngine`
- [ ] 测试所有功能正常工作
- [ ] 更新相关文档

---

*文档版本: 1.0*  
*更新日期: 2026-03-04*
