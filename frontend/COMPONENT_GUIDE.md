# 前端组件使用指南

本文档详细介绍前端组件的使用方法，包括统一组件接口、ContentListPage使用指南和Store使用指南。

## 目录

1. [统一组件接口](#统一组件接口)
2. [ContentListPage使用指南](#contentlistpage使用指南)
3. [Store使用指南](#store使用指南)
4. [API服务使用](#api服务使用)
5. [最佳实践](#最佳实践)

---

## 统一组件接口

### 设计原则

所有组件遵循以下设计原则：

1. **Props优先**: 通过props控制组件行为，减少内部状态
2. **事件回调**: 通过回调函数与父组件通信
3. **类型安全**: 完整的TypeScript类型定义
4. **可复用性**: 通用组件支持多种使用场景

### 通用Props模式

```typescript
// 基础Props接口
interface BaseComponentProps {
  // 样式相关
  className?: string;
  style?: React.CSSProperties;
  
  // 事件回调
  onClick?: (event: React.MouseEvent) => void;
  onChange?: (value: any) => void;
  
  // 状态控制
  loading?: boolean;
  disabled?: boolean;
  
  // 子元素
  children?: React.ReactNode;
}
```

---

## ContentListPage使用指南

### 组件概述

`ContentListPage` 是一个高度可复用的内容列表页面组件，支持图片、视频、文档等多种内容类型的展示和管理。

### Props接口

```typescript
export type ContentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'ALL';

export interface ContentListItem {
  id: string;
  url?: string;
  title?: string;
  description?: string;
  created_at?: string;
  original_name?: string;
  content_type?: string;
  metadata?: any;
  source?: 'document' | 'content';
  content?: string;
  doc_type?: string;
}

export interface ContentListPageProps {
  // 基础配置
  contentType: ContentType;
  title: string;
  icon: React.ReactNode;
  
  // 上传配置
  uploadAccept: string;
  uploadButtonText: string;
  
  // 空状态
  emptyText: string;
  emptyIcon?: React.ReactNode;
  
  // 功能开关
  showPreview?: boolean;
  showSearch?: boolean;
  
  // AI分析配置
  analyzingText?: string;
  analyzingDuration?: number;
  
  // 自定义渲染
  renderCardContent?: (item: ContentListItem) => React.ReactNode;
  renderCardCover?: (item: ContentListItem, handlers: {
    onPreview: (url: string) => void;
    onViewDetail: (item: ContentListItem) => void;
    onDelete: (item: ContentListItem) => void;
  }) => React.ReactNode;
  renderDetailContent?: (item: ContentListItem) => React.ReactNode;
  
  // 额外操作
  extraActions?: React.ReactNode;
}
```

### 基础使用

#### 图片库页面

```typescript
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

export default ImagesPage;
```

#### 视频库页面

```typescript
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

export default VideosPage;
```

#### 文档库页面

```typescript
import React from 'react';
import { FileTextOutlined } from '@ant-design/icons';
import ContentListPage from '../pages/ContentListPage';

const DocumentsPage: React.FC = () => (
  <ContentListPage
    contentType="DOCUMENT"
    title="文档库"
    icon={<FileTextOutlined />}
    uploadAccept=".pdf,.doc,.docx,.txt"
    uploadButtonText="上传文档"
    emptyText="暂无文档"
    analyzingText="AI提取文档内容..."
    analyzingDuration={3000}
  />
);

export default DocumentsPage;
```

### 高级自定义

#### 自定义卡片内容

```typescript
import React from 'react';
import { Tag, Progress } from 'antd';
import ContentListPage from '../pages/ContentListPage';

const CustomPage: React.FC = () => (
  <ContentListPage
    contentType="DOCUMENT"
    title="自定义文档库"
    icon={<FileTextOutlined />}
    uploadAccept=".pdf"
    uploadButtonText="上传PDF"
    emptyText="暂无PDF文档"
    
    renderCardContent={(item) => (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Tag color="blue">{item.doc_type?.toUpperCase()}</Tag>
          <Tag color="green">{item.metadata?.page_count || 0} 页</Tag>
        </div>
        <p style={{ color: '#666', fontSize: 12 }}>
          {item.content?.slice(0, 100)}...
        </p>
        {item.metadata?.processing_progress && (
          <Progress 
            percent={item.metadata.processing_progress} 
            size="small"
            status="active"
          />
        )}
      </div>
    )}
  />
);
```

#### 自定义详情内容

```typescript
import React from 'react';
import { Tabs, Image, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';

const { TabPane } = Tabs;
const { Title, Paragraph } = Typography;

const CustomPage: React.FC = () => (
  <ContentListPage
    contentType="IMAGE"
    title="图片分析库"
    icon={<PictureOutlined />}
    uploadAccept="image/*"
    uploadButtonText="上传图片"
    emptyText="暂无图片"
    
    renderDetailContent={(item) => (
      <Tabs defaultActiveKey="preview">
        <TabPane tab="预览" key="preview">
          <Image 
            src={getFullUrl(item.url || '')} 
            style={{ maxHeight: 400 }}
          />
        </TabPane>
        <TabPane tab="AI分析" key="analysis">
          <Title level={4}>图片描述</Title>
          <Paragraph>
            <ReactMarkdown>{item.description || '暂无分析'}</ReactMarkdown>
          </Paragraph>
          {item.metadata?.objects && (
            <>
              <Title level={4}>识别到的对象</Title>
              <ul>
                {item.metadata.objects.map((obj: string, i: number) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </>
          )}
        </TabPane>
        <TabPane tab="元数据" key="metadata">
          <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
        </TabPane>
      </Tabs>
    )}
  />
);
```

#### 自定义卡片封面

```typescript
import React from 'react';
import { Card, Badge, Button } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';

const CustomPage: React.FC = () => (
  <ContentListPage
    contentType="VIDEO"
    title="视频库"
    icon={<VideoCameraOutlined />}
    uploadAccept="video/*"
    uploadButtonText="上传视频"
    emptyText="暂无视频"
    
    renderCardCover={(item, { onPreview, onViewDetail, onDelete }) => (
      <div style={{ position: 'relative' }}>
        <video
          src={getFullUrl(item.url || '')}
          style={{ width: '100%', height: 200, objectFit: 'cover' }}
          poster={item.metadata?.thumbnail}
        />
        <Badge 
          count={formatDuration(item.metadata?.duration)} 
          style={{ 
            position: 'absolute', 
            bottom: 8, 
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.7)'
          }}
        />
        <div style={{ 
          position: 'absolute', 
          top: 8, 
          right: 8,
          display: 'flex',
          gap: 8
        }}>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => onViewDetail(item)}
          />
          <Button 
            icon={<DeleteOutlined />} 
            danger
            onClick={() => onDelete(item)}
          />
        </div>
      </div>
    )}
  />
);
```

### Props详解

| Prop | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| contentType | `ContentType` | ✅ | - | 内容类型，决定数据获取方式和展示形式 |
| title | `string` | ✅ | - | 页面标题 |
| icon | `ReactNode` | ✅ | - | 标题图标 |
| uploadAccept | `string` | ✅ | - | 上传文件类型，如 `image/*`、`.pdf` |
| uploadButtonText | `string` | ✅ | - | 上传按钮文字 |
| emptyText | `string` | ✅ | - | 空状态提示文字 |
| emptyIcon | `ReactNode` | ❌ | - | 空状态图标 |
| showPreview | `boolean` | ❌ | `true` | 是否显示预览功能 |
| showSearch | `boolean` | ❌ | `true` | 是否显示搜索框 |
| analyzingText | `string` | ❌ | `'AI分析内容...'` | AI分析阶段提示文字 |
| analyzingDuration | `number` | ❌ | `2500` | AI分析模拟时长（毫秒） |
| renderCardContent | `function` | ❌ | - | 自定义卡片内容渲染 |
| renderCardCover | `function` | ❌ | - | 自定义卡片封面渲染 |
| renderDetailContent | `function` | ❌ | - | 自定义详情弹窗内容 |
| extraActions | `ReactNode` | ❌ | - | 额外的操作按钮 |

---

## Store使用指南

### Store架构

系统使用 **Zustand** 进行状态管理，采用统一的 `AppStore` 设计，同时保持向后兼容。

```
stores/
├── appStore.ts      # 统一应用状态（推荐）
├── chatStore.ts     # 聊天状态（向后兼容）
├── uploadStore.ts   # 上传状态（向后兼容）
└── index.ts         # 统一导出
```

### 使用方式对比

#### 方式1: 统一Store（推荐新项目使用）

```typescript
import { useAppStore } from '../stores';

const MyComponent = () => {
  // 获取所有状态和actions
  const { 
    messages, 
    sendMessage, 
    tasks, 
    addUploadTask,
    ui,
    setLoading
  } = useAppStore();
  
  return (
    <div>
      <button onClick={() => sendMessage('你好')}>
        发送消息
      </button>
      <span>加载状态: {ui.isLoading ? '加载中' : '完成'}</span>
    </div>
  );
};
```

#### 方式2: 选择器Hooks（性能优化）

```typescript
import { 
  useChatState, 
  useChatActions,
  useUploadState,
  useUploadActions,
  useUIState,
  useUIActions
} from '../stores';

const MyComponent = () => {
  // 只订阅Chat状态
  const { messages, currentSessionId } = useChatState();
  
  // 只获取Chat actions
  const { sendMessage, createNewSession } = useChatActions();
  
  // 只订阅Upload状态
  const { tasks } = useUploadState();
  
  // 只获取Upload actions
  const { addUploadTask } = useUploadActions();
  
  // 只订阅UI状态
  const { isLoading, error } = useUIState();
  
  // 只获取UI actions
  const { setLoading, clearError } = useUIActions();
  
  return (...);
};
```

#### 方式3: 精细选择（最佳性能）

```typescript
import { useAppStore } from '../stores';

const MyComponent = () => {
  // 组件只在messages变化时重渲染
  const messages = useAppStore(state => state.messages);
  
  // 单独获取action
  const sendMessage = useAppStore(state => state.sendMessage);
  
  return (...);
};
```

#### 方式4: 向后兼容（旧代码无需修改）

```typescript
import { useChatStore, useUploadStore } from '../stores';

const MyComponent = () => {
  const { messages, sendMessage } = useChatStore();
  const { tasks, addTask } = useUploadStore();
  
  return (...);
};
```

### Store API参考

#### Chat State & Actions

```typescript
// State
interface ChatState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  useRag: boolean;
  recentFiles: { id: string; name: string; type: string }[];
}

// Actions
interface ChatActions {
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => void;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => void;
  loadSessions: () => Promise<void>;
  setUseRag: (use: boolean) => void;
  clearMessages: () => void;
  addRecentFile: (file: { id: string; name: string; type: string }) => void;
}
```

#### Upload State & Actions

```typescript
// State
interface UploadState {
  tasks: UploadTask[];
}

interface UploadTask {
  id: string;
  fileName: string;
  fileType: 'image' | 'video' | 'document';
  progress: number;
  phase: 'uploading' | 'analyzing' | 'completed' | 'error';
  phaseProgress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  result?: any;
  createdAt: number;
}

// Actions
interface UploadActions {
  addUploadTask: (task: Omit<UploadTask, 'id' | 'createdAt' | 'phase' | 'phaseProgress'>) => string;
  updateUploadProgress: (id: string, percent: number) => void;
  startAnalyzing: (id: string, message?: string) => void;
  updateAnalyzingProgress: (id: string, percent: number) => void;
  completeUploadTask: (id: string, result?: any) => void;
  failUploadTask: (id: string, message: string) => void;
  removeUploadTask: (id: string) => void;
  clearCompletedUploads: () => void;
  getActiveUploadCount: () => number;
}
```

#### UI State & Actions

```typescript
// State
interface UIState {
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  uploadPanelOpen: boolean;
  theme: 'light' | 'dark';
}

// Actions
interface UIActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleUploadPanel: () => void;
  setUploadPanelOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

#### User State & Actions

```typescript
// State
interface UserState {
  userId: string | null;
  userName: string | null;
  preferences: Record<string, any>;
}

// Actions
interface UserActions {
  setUser: (userId: string, userName: string) => void;
  clearUser: () => void;
  setUserPreference: (key: string, value: any) => void;
}
```

---

## API服务使用

### 统一API模块

```typescript
import { 
  contentApi, 
  chatApi, 
  skillApi, 
  agentApi 
} from '../services/api';
```

### Content API

```typescript
// 上传内容
const result = await contentApi.uploadContent(
  file, 
  { content_type: 'DOCUMENT' },
  (progress) => console.log(`${progress}%`)
);

// 获取列表
const images = await contentApi.listContents('IMAGE', 0, 20);
const all = await contentApi.listContents(undefined, 0, 100);

// 搜索内容
const results = await contentApi.searchContents('机器学习', 'DOCUMENT', 10);

// 获取详情
const detail = await contentApi.getContentDetail('content-id');

// 删除内容
await contentApi.deleteContent('content-id');
```

### Chat API

```typescript
// 发送消息
const response = await chatApi.sendMessage({
  message: '你好',
  session_id: 'session-001',
  use_rag: true
});

// 流式对话
await chatApi.sendMessageStream(
  { message: '你好', use_rag: true },
  {
    onContent: (chunk) => console.log(chunk),
    onSources: (sources) => console.log(sources),
    onDone: () => console.log('完成')
  }
);

// 获取历史
const history = await chatApi.getHistory('session-001');
```

### Agent API

```typescript
// 执行Agent任务
const result = await agentApi.executeTask({
  description: '分析所有图片',
  context: { files: ['image1.jpg'] }
});

// 流式执行
await agentApi.executeTaskStream(
  '分析所有图片',
  (chunk) => console.log(chunk)
);

// 获取任务状态
const status = await agentApi.getTaskStatus('task-id');
```

### Skill API

```typescript
// 获取所有Skills
const skills = await skillApi.getSkills();

// 调用Skill
const result = await skillApi.invokeSkill('vector_search', {
  query: '机器学习',
  top_k: 5
});
```

---

## 最佳实践

### 1. 性能优化

```typescript
// ✅ 使用选择器避免不必要的重渲染
const messages = useAppStore(state => state.messages);

// ❌ 避免订阅整个store
const { messages, tasks, ui, user } = useAppStore(); // 任何状态变化都会触发重渲染
```

### 2. 错误处理

```typescript
const MyComponent = () => {
  const { setError, clearError } = useUIActions();
  
  const handleAction = async () => {
    try {
      clearError();
      await someAsyncAction();
    } catch (error) {
      setError(error.message);
    }
  };
  
  return (...);
};
```

### 3. 上传任务管理

```typescript
const MyComponent = () => {
  const { addUploadTask, updateUploadProgress, completeUploadTask } = useUploadActions();
  
  const handleUpload = async (file: File) => {
    const taskId = addUploadTask({
      fileName: file.name,
      fileType: 'image',
      progress: 0,
      status: 'uploading'
    });
    
    try {
      await contentApi.uploadContent(
        file,
        {},
        (progress) => updateUploadProgress(taskId, progress)
      );
      completeUploadTask(taskId);
    } catch (error) {
      failUploadTask(taskId, error.message);
    }
  };
  
  return (...);
};
```

### 4. 组件组合

```typescript
// 将ContentListPage与其他组件组合使用
const PageWithExtraActions: React.FC = () => {
  const handleBatchDelete = () => {
    // 批量删除逻辑
  };
  
  return (
    <ContentListPage
      contentType="DOCUMENT"
      title="文档库"
      icon={<FileTextOutlined />}
      uploadAccept=".pdf"
      uploadButtonText="上传文档"
      emptyText="暂无文档"
      extraActions={
        <Button danger onClick={handleBatchDelete}>
          批量删除
        </Button>
      }
    />
  );
};
```

---

*文档版本: 1.0*  
*更新日期: 2026-03-04*
