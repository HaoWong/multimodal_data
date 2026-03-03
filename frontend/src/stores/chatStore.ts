import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { AppState, ChatMessage, ChatSession, MessageSource } from '../types';
import { chatApi } from '../services/api';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 创建新会话
const createNewSession = (title: string = '新对话'): ChatSession => ({
  id: uuidv4(),
  title,
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useChatStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 状态
      currentSessionId: null,
      sessions: [],
      messages: [],
      isLoading: false,
      useRag: true,

      // 最近上传的文件列表
      recentFiles: [] as {id: string, name: string, type: string}[],

      // 添加最近文件
      addRecentFile: (file: {id: string, name: string, type: string}) => {
        set((state) => ({
          recentFiles: [file, ...state.recentFiles].slice(0, 5) // 只保留最近5个
        }));
      },

  // 发送消息
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
    const isAnalysisRequest = analysisKeywords.some(kw => content.includes(kw));
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
      const newSession = createNewSession(title);
      newSession.id = sessionId;
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        messages: [userMessage],
        isLoading: true,
        currentSessionId: sessionId,
      }));
    } else {
      // 更新状态
      set((state) => ({
        messages: [...state.messages, userMessage],
        isLoading: true,
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
      // 调用流式API - 支持RAG引用来源
      // 注意：不传递history，让后端自动从数据库加载当前session的历史记录
      let fullResponse = '';

      await chatApi.sendMessageStream(
        {
          message: messageWithContext,
          session_id: sessionId,
          use_rag: get().useRag,
          // history: 不传递，后端会自动从数据库加载
        },
        {
          onContent: (chunk) => {
            fullResponse += chunk;
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullResponse }
                  : msg
              ),
            }));
          },
          onSources: (sources) => {
            // 收到引用来源后立即更新消息
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, sources }
                  : msg
              ),
            }));
          },
          onDone: () => {
            // 流式完成
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              ),
              isLoading: false,
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
        isLoading: false,
      }));
    }
  },

  // 创建新会话
  createNewSession: () => {
    const newSession = createNewSession('新对话');
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSessionId: newSession.id,
      messages: [],
    }));
  },

  // 切换会话
  switchSession: async (sessionId: string) => {
    set({ currentSessionId: sessionId, isLoading: true });
    
    // 从后端加载历史消息
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/history/${sessionId}`);
      const history = response.data;
      
      // 转换为前端消息格式
      const messages: ChatMessage[] = history.map((msg: any) => ({
        id: uuidv4(),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        sources: msg.sources,
      }));
      
      set({ messages, isLoading: false });
    } catch (error) {
      console.error('加载历史消息失败:', error);
      set({ messages: [], isLoading: false });
    }
  },

  // 删除会话
  deleteSession: async (sessionId: string) => {
    // 从后端删除会话
    try {
      await chatApi.deleteSession(sessionId);
    } catch (error) {
      console.error('删除会话失败:', error);
      throw error;
    }
    
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== sessionId);
      const newCurrentId =
        state.currentSessionId === sessionId
          ? newSessions[0]?.id || null
          : state.currentSessionId;
      return {
        sessions: newSessions,
        currentSessionId: newCurrentId,
        messages: newCurrentId === state.currentSessionId ? state.messages : [],
      };
    });
  },

  // 重命名会话
  renameSession: (sessionId: string, newTitle: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title: newTitle } : s
      ),
    }));
  },

  // 加载会话列表
  loadSessions: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/sessions`);
      const sessionsData = response.data;
      
      // 转换为前端会话格式
      const sessions: ChatSession[] = sessionsData.map((s: any) => ({
        id: s.session_id,
        title: s.last_message.length > 20 ? s.last_message.slice(0, 20) + '...' : s.last_message,
        messages: [],
        createdAt: new Date(s.last_time),
        updatedAt: new Date(s.last_time),
      }));
      
      set({ sessions });
    } catch (error) {
      console.error('加载会话列表失败:', error);
    }
  },

  // 设置是否使用RAG
  setUseRag: (use: boolean) => {
    set({ useRag: use });
  },

  // 清空消息
  clearMessages: () => {
    set({ messages: [] });
  },
}),
    {
      name: 'chat-storage', // localStorage 中的键名
      partialize: (state) => ({
        // 只持久化这些字段
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        recentFiles: state.recentFiles,
        useRag: state.useRag,
      }),
    }
  )
);
