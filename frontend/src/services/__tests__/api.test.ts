import { chatApi, documentApi } from '../api';

// Mock fetch
global.fetch = jest.fn();

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chatApi', () => {
    it('should send chat request successfully', async () => {
      const mockResponse = {
        response: '测试回复',
        sources: [{ id: '1', title: '文档1', similarity: 0.9 }],
        session_id: 'session-123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await chatApi.chat({
        message: '你好',
        use_rag: true,
        history: [],
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            message: '你好',
            use_rag: true,
            history: [],
          }),
        })
      );
    });

    it('should handle chat error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        chatApi.chat({
          message: '你好',
          use_rag: false,
          history: [],
        })
      ).rejects.toThrow();
    });

    it('should stream chat responses', async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: 你好\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: 世界\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
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
        { message: '你好', use_rag: false, history: [] },
        onChunk,
        onComplete,
        onError
      );

      expect(onChunk).toHaveBeenCalledWith('你好');
      expect(onChunk).toHaveBeenCalledWith('世界');
      expect(onComplete).toHaveBeenCalled();
    });

    it('should get chat history', async () => {
      const mockHistory = [
        { role: 'user', content: '你好', timestamp: '2024-01-01' },
        { role: 'assistant', content: '你好！', timestamp: '2024-01-01' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      const result = await chatApi.getHistory('session-123');

      expect(result).toEqual(mockHistory);
    });
  });

  describe('documentApi', () => {
    it('should create document', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: '测试文档',
        content: '内容',
        doc_type: 'text',
        metadata: {},
        created_at: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      });

      const result = await documentApi.createDocument({
        title: '测试文档',
        content: '内容',
      });

      expect(result).toEqual(mockDocument);
    });

    it('should list documents', async () => {
      const mockDocuments = [
        { id: '1', title: '文档1', content: '内容1', doc_type: 'text', metadata: {}, created_at: '2024-01-01' },
        { id: '2', title: '文档2', content: '内容2', doc_type: 'pdf', metadata: {}, created_at: '2024-01-01' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocuments,
      });

      const result = await documentApi.listDocuments();

      expect(result).toEqual(mockDocuments);
      expect(result).toHaveLength(2);
    });

    it('should upload document', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'test.pdf',
        content: 'PDF内容',
        doc_type: 'pdf',
        metadata: {},
        created_at: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      });

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = await documentApi.uploadDocument(file);

      expect(result).toEqual(mockDocument);
    });

    it('should delete document', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await documentApi.deleteDocument('doc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents/doc-123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should search documents', async () => {
      const mockResults = {
        text_results: [{ id: '1', title: '文档1', content: '内容', similarity: 0.95 }],
        image_results: [],
        total_results: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await documentApi.searchDocuments({
        query: '测试',
        search_type: 'text',
        top_k: 5,
      });

      expect(result).toEqual(mockResults);
    });

    it('should search similar documents', async () => {
      const mockResults = {
        text_results: [{ id: '1', title: '文档1', content: '内容', similarity: 0.95 }],
        image_results: [],
        total_results: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await documentApi.searchSimilar('测试查询', 5);

      expect(result).toEqual(mockResults.text_results);
    });
  });
});
