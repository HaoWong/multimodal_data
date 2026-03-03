// ==================== 消息类型 ====================

export interface MessageSource {
  id: string;
  title: string;
  similarity: number;
  text?: string;           // 内容文本
  content_type?: string;   // 类型: TEXT / IMAGE / VIDEO
  source?: string;         // 来源库: 知识库 / 内容库
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: MessageSource[];
  timestamp: Date;
  isStreaming?: boolean;
}

// ==================== 文档类型 ====================

export interface Document {
  id: string;
  title: string;
  content: string;
  doc_type: 'text' | 'pdf' | 'docx';
  metadata: Record<string, any>;
  created_at: string;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

// ==================== API请求/响应类型 ====================

export interface HistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  use_rag: boolean;
  history?: HistoryMessage[];
}

export interface ChatResponse {
  response: string;
  sources: MessageSource[];
  session_id: string;
}

export interface SearchRequest {
  query: string;
  search_type: 'text' | 'image' | 'all';
  top_k: number;
}

export interface SearchResponse {
  text_results: DocumentSearchResult[];
  image_results: any[];
  total_results: number;
}

// ==================== 会话类型 ====================

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 应用状态类型 ====================

export interface AppState {
  // 当前会话
  currentSessionId: string | null;
  sessions: ChatSession[];
  
  // 消息
  messages: ChatMessage[];
  isLoading: boolean;
  
  // 设置
  useRag: boolean;
  
  // 最近文件
  recentFiles: {id: string, name: string, type: string}[];
  addRecentFile: (file: {id: string, name: string, type: string}) => void;
  
  // 操作
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => void;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => void;
  loadSessions: () => Promise<void>;
  setUseRag: (use: boolean) => void;
  clearMessages: () => void;
}
