import { useAppStore } from '../appStore';
import { chatApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api');

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      currentSessionId: null,
      sessions: [],
      messages: [],
      useRag: true,
      recentFiles: [],
      tasks: [],
      ui: {
        isLoading: false,
        error: null,
        sidebarOpen: true,
        uploadPanelOpen: false,
        theme: 'light',
      },
      user: {
        userId: null,
        userName: null,
        preferences: {},
      },
    });
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send message and update state', async () => {
      (chatApi.sendMessageStream as jest.Mock).mockImplementation(
        async (_data: any, callbacks: any) => {
          const chunks = ['你好', '！', '有什么', '可以帮助', '你的？'];
          for (const chunk of chunks) {
            callbacks.onContent(chunk);
          }
          callbacks.onDone?.();
        }
      );

      const { sendMessage } = useAppStore.getState();
      await sendMessage('你好');

      const state = useAppStore.getState();
      expect(state.messages).toHaveLength(2); // user + assistant
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('你好');
      expect(state.messages[1].role).toBe('assistant');
      expect(state.messages[1].content).toBe('你好！有什么可以帮助你的？');
      expect(state.ui.isLoading).toBe(false);
    });

    it('should handle send message error', async () => {
      (chatApi.sendMessageStream as jest.Mock).mockImplementation(
        async (_data: any, _callbacks: any) => {
          throw new Error('Network error');
        }
      );

      const { sendMessage } = useAppStore.getState();
      await sendMessage('你好');

      const state = useAppStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[1].content).toContain('错误');
      expect(state.ui.isLoading).toBe(false);
    });

    it('should use RAG when enabled', async () => {
      (chatApi.sendMessageStream as jest.Mock).mockImplementation(
        async (data: any, callbacks: any) => {
          expect(data.use_rag).toBe(true);
          callbacks.onContent('回复');
          callbacks.onDone?.();
        }
      );

      const { sendMessage } = useAppStore.getState();
      await sendMessage('测试');

      expect(chatApi.sendMessageStream).toHaveBeenCalledWith(
        expect.objectContaining({ use_rag: true }),
        expect.objectContaining({
          onContent: expect.any(Function),
          onDone: expect.any(Function),
        })
      );
    });
  });

  describe('createNewSession', () => {
    it('should create new session', () => {
      const { createNewSession } = useAppStore.getState();
      createNewSession();

      const state = useAppStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.currentSessionId).toBe(state.sessions[0].id);
      expect(state.messages).toHaveLength(0);
    });

    it('should create multiple sessions', () => {
      const { createNewSession } = useAppStore.getState();
      createNewSession();
      createNewSession();
      createNewSession();

      const state = useAppStore.getState();
      expect(state.sessions).toHaveLength(3);
    });
  });

  describe('switchSession', () => {
    it('should switch to existing session', () => {
      const { createNewSession, switchSession } = useAppStore.getState();
      createNewSession();

      const firstSessionId = useAppStore.getState().currentSessionId;

      createNewSession();
      const secondSessionId = useAppStore.getState().currentSessionId;

      switchSession(firstSessionId!);

      expect(useAppStore.getState().currentSessionId).toBe(firstSessionId);
    });
  });

  describe('deleteSession', () => {
    it('should delete session', () => {
      const { createNewSession, deleteSession } = useAppStore.getState();
      createNewSession();
      createNewSession();

      const sessions = useAppStore.getState().sessions;
      const sessionIdToDelete = sessions[0].id;

      deleteSession(sessionIdToDelete);

      const state = useAppStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions.find(s => s.id === sessionIdToDelete)).toBeUndefined();
    });

    it('should switch to another session when deleting current', () => {
      const { createNewSession, deleteSession } = useAppStore.getState();
      createNewSession();
      createNewSession();

      const sessions = useAppStore.getState().sessions;
      const currentId = useAppStore.getState().currentSessionId;

      deleteSession(currentId!);

      const state = useAppStore.getState();
      expect(state.currentSessionId).not.toBe(currentId);
      expect(state.currentSessionId).toBeDefined();
    });
  });

  describe('setUseRag', () => {
    it('should toggle RAG setting', () => {
      const { setUseRag } = useAppStore.getState();

      expect(useAppStore.getState().useRag).toBe(true);

      setUseRag(false);
      expect(useAppStore.getState().useRag).toBe(false);

      setUseRag(true);
      expect(useAppStore.getState().useRag).toBe(true);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages', async () => {
      (chatApi.sendMessageStream as jest.Mock).mockImplementation(
        async (_data: any, callbacks: any) => {
          callbacks.onContent('回复');
          callbacks.onDone?.();
        }
      );

      const { sendMessage, clearMessages } = useAppStore.getState();
      await sendMessage('你好');

      expect(useAppStore.getState().messages).toHaveLength(2);

      clearMessages();

      expect(useAppStore.getState().messages).toHaveLength(0);
    });
  });

  describe('session history', () => {
    it('should maintain session history across messages', async () => {
      const messages: string[] = [];

      (chatApi.sendMessageStream as jest.Mock).mockImplementation(
        async (data: any, callbacks: any) => {
          messages.push(data.message);
          callbacks.onContent('回复');
          callbacks.onDone?.();
        }
      );

      const { sendMessage } = useAppStore.getState();

      await sendMessage('第一条消息');
      await sendMessage('第二条消息');

      // Verify that the second call includes history from the first message
      const secondCall = (chatApi.sendMessageStream as jest.Mock).mock.calls[1];
      expect(secondCall[0].history).toHaveLength(2); // user + assistant from first message
    });
  });
});
