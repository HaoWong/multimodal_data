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
        json: async () => mockResponse,
      });

      const result = await chatApi.chat({
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
        json: async () => mockResponse,
      });

      const result = await chatApi.chat({
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
        json: async () => mockResponse,
      });

      const result = await chatApi.chat({
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
        json: async () => mockResponse,
      });

      const result = await chatApi.chat({
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
        json: async () => mockResponse,
      });

      const result = await chatApi.chat({
        message: 'Test',
        use_rag: false,
        history: longHistory as any,
      });

      expect(result.response).toBe('Got it');
    });

    it('should handle network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        chatApi.chat({
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
        chatApi.chat({
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
        chatApi.chat({
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
            value: new TextEncoder().encode('data: hello\n\n'),
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

      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      await chatApi.chatStream(
        { message: 'Test', use_rag: false, history: [] },
        onChunk,
        onComplete,
        onError
      );

      expect(onChunk).toHaveBeenCalledWith('hello');
      expect(onComplete).toHaveBeenCalled();
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

      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      await chatApi.chatStream(
        { message: 'Test', use_rag: false, history: [] },
        onChunk,
        onComplete,
        onError
      );

      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle empty history response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await chatApi.getHistory('session-123');

      expect(result).toEqual([]);
    });

    it('should handle history with special characters', async () => {
      const mockHistory = [
        { role: 'user', content: '<script>alert("xss")</script>', timestamp: '2024-01-01' },
        { role: 'assistant', content: '🎉 Emoji test', timestamp: '2024-01-01' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      const result = await chatApi.getHistory('session-123');

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('<script>alert("xss")</script>');
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
        json: async () => mockDocument,
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
        json: async () => mockDocument,
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
        json: async () => [],
      });

      const result = await documentApi.listDocuments();

      expect(result).toEqual([]);
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
        json: async () => mockDocuments,
      });

      const result = await documentApi.listDocuments();

      expect(result).toHaveLength(1000);
    });

    it('should handle upload with empty file', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'empty.txt',
        content: '',
        doc_type: 'text',
        metadata: {},
        created_at: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      });

      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      const result = await documentApi.uploadDocument(file);

      expect(result.content).toBe('');
    });

    it('should handle upload with special filename', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'file with spaces & special chars.txt',
        content: 'Content',
        doc_type: 'text',
        metadata: {},
        created_at: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      });

      const file = new File(['content'], 'file with spaces & special chars.txt', { type: 'text/plain' });
      const result = await documentApi.uploadDocument(file);

      expect(result.title).toBe('file with spaces & special chars.txt');
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
      const mockResults = {
        text_results: [],
        image_results: [],
        total_results: 0,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await documentApi.searchDocuments({
        query: '',
        search_type: 'text',
        top_k: 5,
      });

      expect(result.total_results).toBe(0);
    });

    it('should handle search with special characters', async () => {
      const mockResults = {
        text_results: [],
        image_results: [],
        total_results: 0,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await documentApi.searchDocuments({
        query: 'test\' OR \'1\'=\'1',
        search_type: 'text',
        top_k: 5,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("test' OR '1'='1"),
        })
      );
    });

    it('should handle searchSimilar with no results', async () => {
      const mockResults = {
        text_results: [],
        image_results: [],
        total_results: 0,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await documentApi.searchSimilar('query', 5);

      expect(result).toEqual([]);
    });

    it('should handle network error on list', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(documentApi.listDocuments()).rejects.toThrow('Network error');
    });

    it('should handle timeout on upload', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      await expect(documentApi.uploadDocument(file)).rejects.toThrow('Timeout');
    });
  });
});
