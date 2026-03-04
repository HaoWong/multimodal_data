/**
 * 统一应用状态管理 - AppStore
 * 整合 chat、upload、ui、user 等所有状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatSession, MessageSource } from '../types';
import { chatApi } from '../services/api';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ==================== 类型定义 ====================

export interface UploadTask {
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

export interface UIState {
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  uploadPanelOpen: boolean;
  theme: 'light' | 'dark';
}

export interface UserState {
  userId: string | null;
  userName: string | null;
  preferences: Record<string, any>;
}

export interface ChatState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  useRag: boolean;
  recentFiles: { id: string; name: string; type: string }[];
}

export interface UploadState {
  tasks: UploadTask[];
}

// ==================== 统一应用状态接口 ====================

export interface AppStoreState extends ChatState, UploadState {
  // UI 状态
  ui: UIState;
  // 用户状态
  user: UserState;

  // ===== Chat Actions =====
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => void;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => void;
  loadSessions: () => Promise<void>;
  setUseRag: (use: boolean) => void;
  clearMessages: () => void;
  addRecentFile: (file: { id: string; name: string; type: string }) => void;

  // ===== Upload Actions =====
  addUploadTask: (task: Omit<UploadTask, 'id' | 'createdAt' | 'phase' | 'phaseProgress'>) => string;
  updateUploadProgress: (id: string, percent: number) => void;
  startAnalyzing: (id: string, message?: string) => void;
  updateAnalyzingProgress: (id: string, percent: number) => void;
  completeUploadTask: (id: string, result?: any) => void;
  failUploadTask: (id: string, message: string) => void;
  removeUploadTask: (id: string) => void;
  clearCompletedUploads: () => void;
  getActiveUploadCount: () => number;

  // ===== UI Actions =====
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleUploadPanel: () => void;
  setUploadPanelOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // ===== User Actions =====
  setUser: (userId: string, userName: string) => void;
  clearUser: () => void;
  setUserPreference: (key: string, value: any) => void;
}

// ==================== 辅助函数 ====================

const createNewChatSession = (title: string = '新对话'): ChatSession => ({
  id: uuidv4(),
  title,
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ==================== 创建统一 Store ====================

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      // ===== 初始状态 =====
      // Chat 状态
      currentSessionId: null,
      sessions: [],
      messages: [],
      useRag: true,
      recentFiles: [],

      // Upload 状态
      tasks: [],

      // UI 状态
      ui: {
        isLoading: false,
        error: null,
        sidebarOpen: true,
        uploadPanelOpen: false,
        theme: 'light',
      },

      // User 状态
      user: {
        userId: null,
        userName: null,
        preferences: {},
      },

      // ===== Chat Actions =====

      sendMessage: async (content: string) => {
        const state = get();
        let sessionId = state.currentSessionId;
        let isNewSession = false;

        // 如果是新会话，生成sessionId
        if (!sessionId) {
          sessionId = uuidv4();
          isNewSession = true;
        }

        // 构建消息上下文
        let messageWithContext = content;

        // 如果消息较短且包含分析类词汇，自动附加最近上传的文件信息
        const analysisKeywords = ['分析', '打分', '评分', '评价', '评估', '看看', '检查', '总结', '提取'];
        const isAnalysisRequest = analysisKeywords.some((kw) => content.includes(kw));
        const isShortMessage = content.length < 15;

        if ((isAnalysisRequest || isShortMessage) && state.recentFiles.length > 0) {
          const recentFile = state.recentFiles[0];
          messageWithContext = `${content}\n\n[系统提示：用户最近上传的文件是 "${recentFile.name}"]`;
        }

        // 创建用户消息
        const userMessage: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: new Date(),
        };

        // 如果是新会话，使用第一条消息作为标题
        if (isNewSession) {
          const title = content.length > 20 ? content.slice(0, 20) + '...' : content;
          const newSession = createNewChatSession(title);
          newSession.id = sessionId;
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            messages: [userMessage],
            ui: { ...state.ui, isLoading: true },
            currentSessionId: sessionId,
          }));
        } else {
          set((state) => ({
            messages: [...state.messages, userMessage],
            ui: { ...state.ui, isLoading: true },
            currentSessionId: sessionId,
          }));
        }

        // 创建助手消息占位
        const assistantMessageId = uuidv4();
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        };

        set((state) => ({
          messages: [...state.messages, assistantMessage],
        }));

        try {
          let fullResponse = '';

          await chatApi.sendMessageStream(
            {
              message: messageWithContext,
              session_id: sessionId,
              use_rag: get().useRag,
            },
            {
              onContent: (chunk) => {
                fullResponse += chunk;
                set((state) => ({
                  messages: state.messages.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: fullResponse } : msg
                  ),
                }));
              },
              onSources: (sources) => {
                set((state) => ({
                  messages: state.messages.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, sources } : msg
                  ),
                }));
              },
              onDone: () => {
                set((state) => ({
                  messages: state.messages.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
                  ),
                  ui: { ...state.ui, isLoading: false },
                }));
              },
            }
          );
        } catch (error) {
          console.error('Send message error:', error);
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: '抱歉，发生了错误，请重试。', isStreaming: false }
                : msg
            ),
            ui: { ...state.ui, isLoading: false, error: '发送消息失败，请重试' },
          }));
        }
      },

      createNewSession: () => {
        const newSession = createNewChatSession('新对话');
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
          messages: [],
        }));
      },

      switchSession: async (sessionId: string) => {
        set((state) => ({
          currentSessionId: sessionId,
          ui: { ...state.ui, isLoading: true },
        }));

        try {
          const response = await axios.get(`${API_BASE_URL}/api/chat/history/${sessionId}`);
          const history = response.data;

          const messages: ChatMessage[] = history.map((msg: any) => ({
            id: uuidv4(),
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            sources: msg.sources,
          }));

          set((state) => ({
            messages,
            ui: { ...state.ui, isLoading: false },
          }));
        } catch (error) {
          console.error('加载历史消息失败:', error);
          set((state) => ({
            messages: [],
            ui: { ...state.ui, isLoading: false, error: '加载历史消息失败' },
          }));
        }
      },

      deleteSession: async (sessionId: string) => {
        try {
          await chatApi.deleteSession(sessionId);
        } catch (error) {
          console.error('删除会话失败:', error);
          throw error;
        }

        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          const newCurrentId =
            state.currentSessionId === sessionId ? newSessions[0]?.id || null : state.currentSessionId;
          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
            messages: newCurrentId === state.currentSessionId ? state.messages : [],
          };
        });
      },

      renameSession: (sessionId: string, newTitle: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title: newTitle } : s
          ),
        }));
      },

      loadSessions: async () => {
        try {
          // 使用封装好的 chatApi 获取会话列表
          const sessionsData = await chatApi.getSessions();

          // 处理空数据情况
          if (!sessionsData || sessionsData.length === 0) {
            set({ sessions: [] });
            return;
          }

          const sessions: ChatSession[] = sessionsData.map((s: any) => ({
            id: s.session_id,
            title: s.last_message ? (s.last_message.length > 20 ? s.last_message.slice(0, 20) + '...' : s.last_message) : '新会话',
            messages: [],
            createdAt: new Date(s.last_time || Date.now()),
            updatedAt: new Date(s.last_time || Date.now()),
          }));

          set({ sessions });
        } catch (error) {
          console.error('加载会话列表失败:', error);
          // 不显示错误提示，避免影响用户体验
          set({ sessions: [] });
        }
      },

      setUseRag: (use: boolean) => {
        set({ useRag: use });
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      addRecentFile: (file: { id: string; name: string; type: string }) => {
        set((state) => ({
          recentFiles: [file, ...state.recentFiles].slice(0, 5),
        }));
      },

      // ===== Upload Actions =====

      addUploadTask: (task) => {
        const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newTask: UploadTask = {
          ...task,
          id,
          phase: 'uploading',
          phaseProgress: 0,
          createdAt: Date.now(),
        };
        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));
        return id;
      },

      updateUploadProgress: (id, percent) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  phase: 'uploading',
                  phaseProgress: percent,
                  progress: Math.round(percent * 0.5),
                }
              : t
          ),
        }));
      },

      startAnalyzing: (id, message) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  phase: 'analyzing',
                  phaseProgress: 0,
                  progress: 50,
                  message: message || 'AI分析中...',
                }
              : t
          ),
        }));
      },

      updateAnalyzingProgress: (id, percent) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  phase: 'analyzing',
                  phaseProgress: percent,
                  progress: Math.round(50 + percent * 0.4),
                }
              : t
          ),
        }));
      },

      completeUploadTask: (id, result) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  phase: 'completed',
                  phaseProgress: 100,
                  progress: 100,
                  status: 'completed',
                  message: '完成',
                  result,
                }
              : t
          ),
        }));
      },

      failUploadTask: (id, message) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, phase: 'error', status: 'error', message } : t
          ),
        }));
      },

      removeUploadTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },

      clearCompletedUploads: () => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.status !== 'completed' && t.status !== 'error'),
        }));
      },

      getActiveUploadCount: () => {
        return get().tasks.filter(
          (t) => t.status === 'pending' || t.status === 'uploading' || t.status === 'processing'
        ).length;
      },

      // ===== UI Actions =====

      setLoading: (loading: boolean) => {
        set((state) => ({
          ui: { ...state.ui, isLoading: loading },
        }));
      },

      setError: (error: string | null) => {
        set((state) => ({
          ui: { ...state.ui, error },
        }));
      },

      clearError: () => {
        set((state) => ({
          ui: { ...state.ui, error: null },
        }));
      },

      toggleSidebar: () => {
        set((state) => ({
          ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
        }));
      },

      setSidebarOpen: (open: boolean) => {
        set((state) => ({
          ui: { ...state.ui, sidebarOpen: open },
        }));
      },

      toggleUploadPanel: () => {
        set((state) => ({
          ui: { ...state.ui, uploadPanelOpen: !state.ui.uploadPanelOpen },
        }));
      },

      setUploadPanelOpen: (open: boolean) => {
        set((state) => ({
          ui: { ...state.ui, uploadPanelOpen: open },
        }));
      },

      setTheme: (theme: 'light' | 'dark') => {
        set((state) => ({
          ui: { ...state.ui, theme },
        }));
      },

      // ===== User Actions =====

      setUser: (userId: string, userName: string) => {
        set((state) => ({
          user: { ...state.user, userId, userName },
        }));
      },

      clearUser: () => {
        set((state) => ({
          user: { userId: null, userName: null, preferences: {} },
        }));
      },

      setUserPreference: (key: string, value: any) => {
        set((state) => ({
          user: {
            ...state.user,
            preferences: { ...state.user.preferences, [key]: value },
          },
        }));
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        // 只持久化这些字段
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        recentFiles: state.recentFiles,
        useRag: state.useRag,
        ui: {
          sidebarOpen: state.ui.sidebarOpen,
          theme: state.ui.theme,
        },
        user: {
          userId: state.user.userId,
          userName: state.user.userName,
          preferences: state.user.preferences,
        },
      }),
    }
  )
);

// ==================== 选择器 hooks (用于优化性能) ====================

export const useChatState = () =>
  useAppStore((state) => ({
    currentSessionId: state.currentSessionId,
    sessions: state.sessions,
    messages: state.messages,
    useRag: state.useRag,
    recentFiles: state.recentFiles,
  }));

export const useChatActions = () =>
  useAppStore((state) => ({
    sendMessage: state.sendMessage,
    createNewSession: state.createNewSession,
    switchSession: state.switchSession,
    deleteSession: state.deleteSession,
    renameSession: state.renameSession,
    loadSessions: state.loadSessions,
    setUseRag: state.setUseRag,
    clearMessages: state.clearMessages,
    addRecentFile: state.addRecentFile,
  }));

export const useUploadState = () =>
  useAppStore((state) => ({
    tasks: state.tasks,
  }));

export const useUploadActions = () =>
  useAppStore((state) => ({
    addUploadTask: state.addUploadTask,
    updateUploadProgress: state.updateUploadProgress,
    startAnalyzing: state.startAnalyzing,
    updateAnalyzingProgress: state.updateAnalyzingProgress,
    completeUploadTask: state.completeUploadTask,
    failUploadTask: state.failUploadTask,
    removeUploadTask: state.removeUploadTask,
    clearCompletedUploads: state.clearCompletedUploads,
    getActiveUploadCount: state.getActiveUploadCount,
  }));

export const useUIState = () =>
  useAppStore((state) => ({
    isLoading: state.ui.isLoading,
    error: state.ui.error,
    sidebarOpen: state.ui.sidebarOpen,
    uploadPanelOpen: state.ui.uploadPanelOpen,
    theme: state.ui.theme,
  }));

export const useUIActions = () =>
  useAppStore((state) => ({
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
    toggleUploadPanel: state.toggleUploadPanel,
    setUploadPanelOpen: state.setUploadPanelOpen,
    setTheme: state.setTheme,
  }));

export const useUserState = () =>
  useAppStore((state) => ({
    userId: state.user.userId,
    userName: state.user.userName,
    preferences: state.user.preferences,
  }));

export const useUserActions = () =>
  useAppStore((state) => ({
    setUser: state.setUser,
    clearUser: state.clearUser,
    setUserPreference: state.setUserPreference,
  }));
