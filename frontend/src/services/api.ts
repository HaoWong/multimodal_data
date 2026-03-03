import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加错误处理
api.interceptors.request.use(
  (config) => {
    console.log(`API请求: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API响应错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================== 文档API ====================

export const documentApi = {
  // 创建文档
  createDocument: async (data: { title: string; content: string; doc_type?: string; metadata?: object }) => {
    const response = await api.post('/api/documents/', data);
    return response.data;
  },

  // 获取文档列表
  getDocuments: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get(`/api/documents/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // 获取文档详情
  getDocument: async (id: string) => {
    const response = await api.get(`/api/documents/${id}`);
    return response.data;
  },

  // 搜索文档
  searchDocuments: async (query: string, topK: number = 5) => {
    const response = await api.post('/api/documents/search', {
      query,
      top_k: topK,
    });
    return response.data;
  },

  // 删除文档
  deleteDocument: async (id: string) => {
    const response = await api.delete(`/api/documents/${id}`);
    return response.data;
  },

  // 上传文件（支持进度回调）
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },
};

// ==================== 对话API ====================

export interface MessageSource {
  id: string;
  title: string;
  similarity: number;
  content?: string;
}

export interface ChatStreamCallbacks {
  onContent: (chunk: string) => void;
  onSources?: (sources: MessageSource[]) => void;
  onDone?: () => void;
}

export const chatApi = {
  // 发送消息（非流式）
  sendMessage: async (data: {
    message: string;
    session_id?: string;
    use_rag?: boolean;
    history?: Array<{ role: string; content: string }>;
  }): Promise<{ response: string; sources: MessageSource[]; session_id: string }> => {
    const response = await api.post('/api/chat', data);
    return response.data;
  },

  // 获取会话列表
  getSessions: async (limit: number = 50) => {
    const response = await api.get(`/api/chat/sessions?limit=${limit}`);
    return response.data;
  },

  // 删除会话
  deleteSession: async (sessionId: string) => {
    const response = await api.delete(`/api/chat/sessions/${sessionId}`);
    return response.data;
  },

  // 发送消息（流式）- 支持RAG引用来源
  sendMessageStream: async (
    data: {
      message: string;
      session_id?: string;
      use_rag?: boolean;
      history?: Array<{ role: string; content: string }>;
    },
    callbacks: ChatStreamCallbacks
  ) => {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onDone?.();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'sources' && callbacks.onSources) {
              callbacks.onSources(parsed.data);
            } else if (parsed.type === 'content') {
              callbacks.onContent(parsed.data);
            } else if (parsed.type === 'done') {
              callbacks.onDone?.();
            }
          } catch (e) {
            console.error('Failed to parse chunk:', e);
          }
        }
      }
    }
  },
};

// ==================== 图片API ====================

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
}

export const imageApi = {
  // 上传图片（支持进度回调）
  uploadImage: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  // 获取图片列表
  listImages: async (): Promise<MediaItem[]> => {
    const response = await api.get('/api/images/');
    return response.data;
  },

  // 获取图片详情
  getImageDetail: async (id: string): Promise<MediaDetail> => {
    const response = await api.get(`/api/images/${id}`);
    return response.data;
  },

  // 搜索图片
  searchImages: async (query: string, topK: number = 5) => {
    const response = await api.post(`/api/images/search?query=${encodeURIComponent(query)}&top_k=${topK}`);
    return response.data;
  },

  // 删除图片
  deleteImage: async (id: string) => {
    const response = await api.delete(`/api/images/${id}`);
    return response.data;
  },
};

// ==================== 统一内容API ====================

export const contentApi = {
  // 上传内容（支持文档、图片、视频，支持进度回调）
  uploadContent: async (
    file: File,
    metadata?: object,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    try {
      const response = await api.post('/api/contents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60秒超时，大文件需要更长时间
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('上传失败:', error);
      if (error.response) {
        throw new Error(error.response.data?.detail || `上传失败: ${error.response.status}`);
      } else if (error.request) {
        throw new Error('无法连接到服务器，请检查后端是否运行');
      } else {
        throw new Error(`上传错误: ${error.message}`);
      }
    }
  },

  // 获取内容列表
  listContents: async (contentType?: string, skip: number = 0, limit: number = 100) => {
    let url = `/api/contents/?skip=${skip}&limit=${limit}`;
    if (contentType) url += `&content_type=${contentType}`;
    const response = await api.get(url);
    return response.data;
  },

  // 获取内容详情
  getContentDetail: async (id: string): Promise<MediaDetail> => {
    const response = await api.get(`/api/contents/${id}`);
    return response.data;
  },

  // 搜索内容
  searchContents: async (query: string, contentType?: string, topK: number = 5) => {
    let url = `/api/contents/search?query=${encodeURIComponent(query)}&top_k=${topK}`;
    if (contentType) url += `&content_type=${contentType}`;
    const response = await api.post(url);
    return response.data;
  },

  // 删除内容
  deleteContent: async (id: string) => {
    const response = await api.delete(`/api/contents/${id}`);
    return response.data;
  },
};

// ==================== Skill API ====================

export const skillApi = {
  // 获取所有可用skills
  listSkills: async () => {
    const response = await api.get('/api/skills/');
    return response.data;
  },

  // 调用skill
  invokeSkill: async (skillName: string, params: object) => {
    const response = await api.post('/api/skills/invoke', {
      skill_name: skillName,
      params,
    });
    return response.data;
  },
};

// ==================== Agent API ====================

export const agentApi = {
  // 执行Agent任务
  executeTask: async (task: string, context?: object) => {
    const response = await api.post('/api/agent/execute', {
      task,
      context,
    });
    return response.data;
  },

  // 流式执行Agent任务
  executeTaskStream: async (
    task: string,
    onChunk: (chunk: string) => void,
    context?: object
  ) => {
    const response = await fetch(`${API_BASE_URL}/api/agent/execute/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, context }),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            onChunk(parsed.chunk || JSON.stringify(parsed));
          } catch (e) {
            console.error('Failed to parse chunk:', e);
          }
        }
      }
    }
  },

  // 获取所有任务列表
  listTasks: async (limit: number = 50) => {
    const response = await api.get(`/api/agent/tasks?limit=${limit}`);
    return response.data;
  },

  // 获取单个任务详情
  getTask: async (taskId: string) => {
    const response = await api.get(`/api/agent/task/${taskId}`);
    return response.data;
  },
};

export default api;
