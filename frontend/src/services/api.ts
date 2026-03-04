import { BaseApiService, PaginatedData, StreamCallbacks } from './baseApi';
import { APIError } from './APIError';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 创建 API 服务实例
const apiService = new BaseApiService({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ==================== 类型定义 ====================

export interface MessageSource {
  id: string;
  title: string;
  similarity: number;
  content?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  description?: string;
  created_at?: string;
  original_name?: string;
  metadata?: any;
}

export interface MediaDetail extends MediaItem {
  metadata?: any;
  extracted_text?: string;
  original_name?: string;
  content_type?: string;
  file_size?: number;
  mime_type?: string;
}

export interface ChatStreamCallbacks {
  onContent: (chunk: string) => void;
  onSources?: (sources: MessageSource[]) => void;
  onDone?: () => void;
  onError?: (error: APIError) => void;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResponse {
  response: string;
  sources: MessageSource[];
  session_id: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  doc_type?: string;
  metadata?: object;
  created_at?: string;
  updated_at?: string;
}

export interface ContentItem extends MediaItem {
  content_type?: string;
}

export interface Skill {
  name: string;
  description: string;
  parameters?: object;
}

export interface AgentTask {
  task_id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  step_count: number;
  has_result: boolean;
}

export interface AgentTaskDetail extends AgentTask {
  final_result: string;
  steps: Array<{
    step_number: number;
    skill_name: string;
    reasoning: string;
    success?: boolean;
    error?: string;
  }>;
}

// SSE 消息类型
interface ChatStreamMessage {
  type: 'content' | 'sources' | 'done';
  data: any;
}

interface AgentStreamMessage {
  chunk?: string;
  [key: string]: any;
}

// ==================== 文档 API (向后兼容，使用统一内容管理API) ====================

export const documentApi = {
  // 创建文档 - 使用统一内容管理API
  createDocument: async (data: {
    title: string;
    content: string;
    doc_type?: string;
    metadata?: object;
  }): Promise<Document> => {
    return apiService.post('/api/contents/documents/create', data);
  },

  // 获取文档列表 - 使用统一内容管理API
  getDocuments: async (skip: number = 0, limit: number = 100): Promise<{ items: Document[]; total: number }> => {
    const response: any = await apiService.get('/api/contents/documents/list', { skip, limit });
    
    // 处理统一响应格式 {success, data, message}
    if (response && response.success && Array.isArray(response.data)) {
      return { items: response.data, total: response.data.length };
    }
    
    // 兼容旧格式或直接使用数组的情况
    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }
    
    // 如果已经是 {items, total} 格式
    if (response && response.items) {
      return response;
    }
    
    return { items: [], total: 0 };
  },

  // 获取文档详情 - 使用统一内容管理API
  getDocument: async (id: string): Promise<Document> => {
    return apiService.get(`/api/contents/documents/${id}`);
  },

  // 搜索文档 - 使用统一内容管理API
  searchDocuments: async (query: string, topK: number = 5): Promise<Document[]> => {
    return apiService.post('/api/contents/documents/search', { query, top_k: topK });
  },

  // 删除文档 - 使用统一内容管理API
  deleteDocument: async (id: string): Promise<void> => {
    return apiService.delete(`/api/contents/documents/${id}`);
  },

  // 上传文件（支持进度回调）- 使用统一内容管理API
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; message: string }> => {
    return apiService.upload('/api/contents/documents/upload', file, onProgress);
  },
};

// ==================== 对话 API ====================

export const chatApi = {
  // 发送消息（非流式）
  sendMessage: async (data: {
    message: string;
    session_id?: string;
    use_rag?: boolean;
    history?: ChatMessage[];
  }): Promise<ChatResponse> => {
    return apiService.post('/api/chat', data);
  },

  // 获取会话列表
  getSessions: async (limit: number = 50): Promise<any[]> => {
    const response: any = await apiService.get('/api/chat/sessions', { limit });
    // 后端返回统一格式 {success, data, message}
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    // 兼容旧格式（直接返回数组）
    return Array.isArray(response) ? response : [];
  },

  // 删除会话
  deleteSession: async (sessionId: string): Promise<void> => {
    return apiService.delete(`/api/chat/sessions/${sessionId}`);
  },

  // 发送消息（流式）- 支持 RAG 引用来源
  sendMessageStream: async (
    data: {
      message: string;
      session_id?: string;
      use_rag?: boolean;
      history?: ChatMessage[];
    },
    callbacks: ChatStreamCallbacks
  ): Promise<void> => {
    const streamCallbacks: StreamCallbacks<ChatStreamMessage> = {
      onData: (message) => {
        if (message.type === 'sources' && callbacks.onSources) {
          callbacks.onSources(message.data);
        } else if (message.type === 'content') {
          callbacks.onContent(message.data);
        } else if (message.type === 'done') {
          callbacks.onDone?.();
        }
      },
      onError: callbacks.onError,
      onDone: callbacks.onDone,
    };

    // 自定义 SSE 消息解析器
    const messageParser = (line: string): ChatStreamMessage | null => {
      if (!line.startsWith('data: ')) return null;
      const dataStr = line.slice(6);
      if (dataStr === '[DONE]') return null;
      try {
        return JSON.parse(dataStr);
      } catch {
        return null;
      }
    };

    await apiService.stream('/api/chat/stream', data, streamCallbacks, messageParser);
  },
};

// ==================== 图片 API (向后兼容，使用统一内容管理API) ====================

export const imageApi = {
  // 上传图片（支持进度回调）- 使用统一内容管理API
  uploadImage: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; message: string }> => {
    return apiService.upload('/api/contents/images/upload', file, onProgress);
  },

  // 获取图片列表 - 使用统一内容管理API
  listImages: async (): Promise<MediaItem[]> => {
    const response: any = await apiService.get('/api/contents/images/list');
    
    // 处理统一响应格式 {success, data, message}
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    
    // 兼容旧格式（直接返回数组）
    if (Array.isArray(response)) {
      return response;
    }
    
    return [];
  },

  // 获取图片详情 - 使用统一内容管理API
  getImageDetail: async (id: string): Promise<MediaDetail> => {
    return apiService.get(`/api/contents/images/${id}`);
  },

  // 搜索图片 - 使用统一内容管理API
  searchImages: async (query: string, topK: number = 5): Promise<MediaItem[]> => {
    return apiService.post('/api/contents/images/search', { query, top_k: topK });
  },

  // 删除图片 - 使用统一内容管理API
  deleteImage: async (id: string): Promise<void> => {
    return apiService.delete(`/api/contents/images/${id}`);
  },
};

// ==================== 统一内容 API ====================

export const contentApi = {
  // 上传内容（支持文档、图片、视频，支持进度回调）
  uploadContent: async (
    file: File,
    metadata?: object,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; message: string; content_type: string }> => {
    return apiService.upload(
      '/api/contents/upload',
      file,
      onProgress,
      metadata ? { metadata } : undefined,
      60000 // 大文件需要更长时间
    );
  },

  // 获取内容列表
  listContents: async (
    contentType?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<{ items: ContentItem[]; total: number }> => {
    const params: Record<string, any> = { skip, limit };
    if (contentType) params.content_type = contentType;
    const response: any = await apiService.get('/api/contents/', params);
    
    // 处理统一响应格式 {success, data, message}
    if (response && response.success && Array.isArray(response.data)) {
      return { items: response.data, total: response.data.length };
    }
    
    // 兼容旧格式或直接使用数组的情况
    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }
    
    // 如果已经是 {items, total} 格式
    if (response && response.items) {
      return response;
    }
    
    return { items: [], total: 0 };
  },

  // 获取内容详情
  getContentDetail: async (id: string): Promise<MediaDetail> => {
    return apiService.get(`/api/contents/${id}`);
  },

  // 搜索内容
  searchContents: async (
    query: string,
    contentType?: string,
    topK: number = 5
  ): Promise<ContentItem[]> => {
    const params: Record<string, any> = { query, top_k: topK };
    if (contentType) params.content_type = contentType;
    return apiService.post('/api/contents/search', params);
  },

  // 删除内容
  deleteContent: async (id: string): Promise<void> => {
    return apiService.delete(`/api/contents/${id}`);
  },
};

// ==================== Skill API ====================

export const skillApi = {
  // 获取所有可用 skills
  listSkills: async (): Promise<Skill[]> => {
    return apiService.get('/api/skills/');
  },

  // 调用 skill
  invokeSkill: async <T = any>(skillName: string, params: object): Promise<T> => {
    return apiService.post('/api/skills/invoke', { skill_name: skillName, params });
  },
};

// ==================== Agent API ====================

export const agentApi = {
  // 执行 Agent 任务
  executeTask: async <T = any>(task: string, context?: object): Promise<T> => {
    return apiService.post('/api/agent/execute', { task, context });
  },

  // 流式执行 Agent 任务
  executeTaskStream: async (
    task: string,
    onChunk: (chunk: string) => void,
    context?: object,
    onError?: (error: APIError) => void,
    onDone?: () => void
  ): Promise<void> => {
    const callbacks: StreamCallbacks<AgentStreamMessage> = {
      onData: (message) => {
        onChunk(message.chunk || JSON.stringify(message));
      },
      onError,
      onDone,
    };

    // 自定义 SSE 消息解析器
    const messageParser = (line: string): AgentStreamMessage | null => {
      if (!line.startsWith('data: ')) return null;
      const dataStr = line.slice(6);
      if (dataStr === '[DONE]') return null;
      try {
        return JSON.parse(dataStr);
      } catch {
        return null;
      }
    };

    await apiService.stream('/api/agent/execute/stream', { task, context }, callbacks, messageParser);
  },

  // 获取所有任务列表
  listTasks: async (limit: number = 50): Promise<PaginatedData<AgentTask>> => {
    return apiService.get('/api/agent/tasks', { limit });
  },

  // 获取单个任务详情
  getTask: async (taskId: string): Promise<AgentTaskDetail> => {
    return apiService.get(`/api/agent/task/${taskId}`);
  },
};

// ==================== 导出 API 服务实例和工具 ====================

export { apiService, API_BASE_URL, APIError };

// 导出默认的 axios 实例（向后兼容）
export default apiService.getAxiosInstance();
