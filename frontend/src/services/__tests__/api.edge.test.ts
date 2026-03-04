import { chatApi, documentApi } from '../api';

global.fetch = jest.fn();

describe('API Services Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chatApi edge cases', () => {
    it('should handle very long message', async () => {
      const longMessage = 'A'.repeat(10000);
      const mockResponse = {
        response: 'Received',
        sources: [],
        session_id: 'session-123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await chatApi.sendMessage({
        message: longMessage,
        use_rag: false,
        history: [],
      });

      expect(result.response).toBe('Received');
    });

    it('should handle empty message', async () => {
      const mockResponse = {
        response: '',
        sources: [],
        session_id: 'session-123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await chatApi.sendMessage({
        message: '',
        use_rag: false,
        history: [],
      });

      expect(result.response).toBe('');
    });

    it('should handle special characters in message', async () => {
      const specialMessage = '<script>alert("xss")</script>';
      const mockResponse = {
        response: 'Safe response',
        sources: [],
        session_id: 'session-123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      await chatApi.sendMessage({
        message: specialMessage,
        use_rag: false,
        history: [],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('<script>'),
        })
      );
    });

    it('should handle unicode in message', async () => {
      const unicodeMessage = '🎉 你好世界 🌍';
      const mockResponse = {
        response: '收到',
        sources: [],
        session_id: 'session-123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await chatApi.sendMessage({
        message: unicodeMessage,
        use_rag: false,
        history: [],
      });

      expect(result.response).toBe('收到');
    });

    it('should handle very long history', async () => {
      const longHistory = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const mockResponse = {
        response: 'Got it',
        sources: [],
        session_id: 'session-123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await chatApi.sendMessage({
        message: 'Test',
        use_rag: false,
        history: longHistory as any,
      });

      expect(result.response).toBe('Got it');
    });

    it('should handle network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        chatApi.sendMessage({
          message: 'Test',
          use_rag: false,
          history: [],
        })
      ).rejects.toThrow('Network timeout');
    });

    it('should handle 500 server error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        chatApi.sendMessage({
          message: 'Test',
          use_rag: false,
          history: [],
        })
      ).rejects.toThrow();
    });

    it('should handle 429 rate limit error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(
        chatApi.sendMessage({
          message: 'Test',
          use_rag: false,
          history: [],
        })
      ).rejects.toThrow();
    });

    it('should handle stream with empty chunks', async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(''),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "content", "data": "hello"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
          }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onContent = jest.fn();
      const onDone = jest.fn();

      await chatApi.sendMessageStream(
        { message: 'Test', use_rag: false, history: [] },
        { onContent, onDone }
      );

      expect(onContent).toHaveBeenCalledWith('hello');
      expect(onDone).toHaveBeenCalled();
    });

    it('should handle stream with malformed data', async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('invalid data\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
          }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onContent = jest.fn();
      const onDone = jest.fn();

      await chatApi.sendMessageStream(
        { message: 'Test', use_rag: false, history: [] },
        { onContent, onDone }
      );

      expect(onDone).toHaveBeenCalled();
    });

    it('should handle empty sessions response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { sessions: [] } }),
      });

      const result = await chatApi.getSessions();

      expect(result.sessions).toEqual([]);
    });
  });

  describe('documentApi edge cases', () => {
    it('should handle document with very long content', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'Long Doc',
        content: 'A'.repeat(100000),
        doc_type: 'text',
        metadata: {},
        created_at: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDocument }),
      });

      const result = await documentApi.createDocument({
        title: 'Long Doc',
        content: 'A'.repeat(100000),
      });

      expect(result.content).toHaveLength(100000);
    });

    it('should handle document with special characters', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: '<script>alert("xss")</script>',
        content: '🎉 Special chars: <>&"\'',
        doc_type: 'text',
        metadata: {},
        created_at: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDocument }),
      });

      const result = await documentApi.createDocument({
        title: '<script>alert("xss")</script>',
        content: '🎉 Special chars: <>&"\'',
      });

      expect(result.title).toBe('<script>alert("xss")</script>');
    });

    it('should handle empty document list', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 } }),
      });

      const result = await documentApi.getDocuments();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle very large document list', async () => {
      const mockDocuments = Array.from({ length: 1000 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        content: `Content ${i}`,
        doc_type: 'text',
        metadata: {},
        created_at: '2024-01-01',
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            items: mockDocuments,
            total: 1000,
            page: 1,
            pageSize: 1000,
            totalPages: 1,
          },
        }),
      });

      const result = await documentApi.getDocuments(0, 1000);

      expect(result.items).toHaveLength(1000);
    });

    it('should handle upload with empty file', async () => {
      const mockResponse = {
        id: 'doc-123',
        message: '上传成功',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      const result = await documentApi.uploadFile(file);

      expect(result.id).toBe('doc-123');
    });

    it('should handle upload with special filename', async () => {
      const mockResponse = {
        id: 'doc-123',
        message: '上传成功',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const file = new File(['content'], 'file with spaces & special chars.txt', { type: 'text/plain' });
      const result = await documentApi.uploadFile(file);

      expect(result.id).toBe('doc-123');
    });

    it('should handle delete non-existent document', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(documentApi.deleteDocument('non-existent')).rejects.toThrow();
    });

    it('should handle search with empty query', async () => {
      const mockResults: any[] = [];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResults }),
      });

      const result = await documentApi.searchDocuments('', 5);

      expect(result).toHaveLength(0);
    });

    it('should handle search with special characters', async () => {
      const mockResults: any[] = [];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResults }),
      });

      await documentApi.searchDocuments("test' OR '1'='1", 5);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("test' OR '1'='1")),
        expect.any(Object)
      );
    });

    it('should handle network error on list', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(documentApi.getDocuments()).rejects.toThrow('Network error');
    });

    it('should handle timeout on upload', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      await expect(documentApi.uploadFile(file)).rejects.toThrow('Timeout');
    });
  });
});
