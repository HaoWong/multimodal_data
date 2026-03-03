import { useChatStore } from '../chatStore';
import { chatApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api');

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({
      currentSessionId: null,
      sessions: [],
      messages: [],
      isLoading: false,
      useRag: true,
    });
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send message and update state', async () => {
      const mockStream = jest.fn().mockImplementation(async function* () {
        yield '你好';
        yield '！';
        yield '有什么';
        yield '可以帮助';
        yield '你的？';
      });

      (chatApi.chatStream as jest.Mock).mockImplementation(
        async (_data: any, onChunk: any, onComplete: any) => {
          for await (const chunk of mockStream()) {
            onChunk(chunk);
          }
          onComplete();
        }
      );

      const { sendMessage } = useChatStore.getState();
      await sendMessage('你好');

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(2); // user + assistant
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('你好');
      expect(state.messages[1].role).toBe('assistant');
      expect(state.messages[1].content).toBe('你好！有什么可以帮助你的？');
      expect(state.isLoading).toBe(false);
    });

    it('should handle send message error', async () => {
      (chatApi.chatStream as jest.Mock).mockImplementation(
        async (_data: any, _onChunk: any, _onComplete: any, onError: any) => {
          onError(new Error('Network error'));
        }
      );

      const { sendMessage } = useChatStore.getState();
      await sendMessage('你好');

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[1].content).toBe('抱歉，发生了错误，请重试。');
      expect(state.isLoading).toBe(false);
    });

    it('should use RAG when enabled', async () => {
      const mockStream = jest.fn().mockImplementation(async function* () {
        yield '回复';
      });

      (chatApi.chatStream as jest.Mock).mockImplementation(
        async (data: any, onChunk: any, onComplete: any) => {
          expect(data.use_rag).toBe(true);
          for await (const chunk of mockStream()) {
            onChunk(chunk);
          }
          onComplete();
        }
      );

      const { sendMessage } = useChatStore.getState();
      await sendMessage('测试');

      expect(chatApi.chatStream).toHaveBeenCalledWith(
        expect.objectContaining({ use_rag: true }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('createNewSession', () => {
    it('should create new session', () => {
      const { createNewSession } = useChatStore.getState();
      createNewSession();

      const state = useChatStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.currentSessionId).toBe(state.sessions[0].id);
      expect(state.messages).toHaveLength(0);
    });

    it('should create multiple sessions', () => {
      const { createNewSession } = useChatStore.getState();
      createNewSession();
      createNewSession();
      createNewSession();

      const state = useChatStore.getState();
      expect(state.sessions).toHaveLength(3);
    });
  });

  describe('switchSession', () => {
    it('should switch to existing session', () => {
      const { createNewSession, switchSession } = useChatStore.getState();
      createNewSession();
      
      const firstSessionId = useChatStore.getState().currentSessionId;
      
      createNewSession();
      const secondSessionId = useChatStore.getState().currentSessionId;
      
      switchSession(firstSessionId!);
      
      expect(useChatStore.getState().currentSessionId).toBe(firstSessionId);
    });
  });

  describe('deleteSession', () => {
    it('should delete session', () => {
      const { createNewSession, deleteSession } = useChatStore.getState();
      createNewSession();
      createNewSession();
      
      const sessions = useChatStore.getState().sessions;
      const sessionIdToDelete = sessions[0].id;
      
      deleteSession(sessionIdToDelete);
      
      const state = useChatStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions.find(s => s.id === sessionIdToDelete)).toBeUndefined();
    });

    it('should switch to another session when deleting current', () => {
      const { createNewSession, deleteSession } = useChatStore.getState();
      createNewSession();
      createNewSession();
      
      const sessions = useChatStore.getState().sessions;
      const currentId = useChatStore.getState().currentSessionId;
      
      deleteSession(currentId!);
      
      const state = useChatStore.getState();
      expect(state.currentSessionId).not.toBe(currentId);
      expect(state.currentSessionId).toBeDefined();
    });
  });

  describe('setUseRag', () => {
    it('should toggle RAG setting', () => {
      const { setUseRag } = useChatStore.getState();
      
      expect(useChatStore.getState().useRag).toBe(true);
      
      setUseRag(false);
      expect(useChatStore.getState().useRag).toBe(false);
      
      setUseRag(true);
      expect(useChatStore.getState().useRag).toBe(true);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages', async () => {
      const mockStream = jest.fn().mockImplementation(async function* () {
        yield '回复';
      });

      (chatApi.chatStream as jest.Mock).mockImplementation(
        async (_data: any, onChunk: any, onComplete: any) => {
          for await (const chunk of mockStream()) {
            onChunk(chunk);
          }
          onComplete();
        }
      );

      const { sendMessage, clearMessages } = useChatStore.getState();
      await sendMessage('你好');
      
      expect(useChatStore.getState().messages).toHaveLength(2);
      
      clearMessages();
      
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });

  describe('session history', () => {
    it('should maintain session history across messages', async () => {
      const messages: string[] = [];
      const mockStream = jest.fn().mockImplementation(async function* () {
        yield '回复';
      });

      (chatApi.chatStream as jest.Mock).mockImplementation(
        async (data: any, onChunk: any, onComplete: any) => {
          messages.push(data.message);
          for await (const chunk of mockStream()) {
            onChunk(chunk);
          }
          onComplete();
        }
      );

      const { sendMessage } = useChatStore.getState();
      
      await sendMessage('第一条消息');
      await sendMessage('第二条消息');
      
      // Verify that the second call includes history from the first message
      const secondCall = (chatApi.chatStream as jest.Mock).mock.calls[1];
      expect(secondCall[0].history).toHaveLength(2); // user + assistant from first message
    });
  });
});
