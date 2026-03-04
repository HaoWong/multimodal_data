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
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await chatApi.sendMessage({
        message: '你好',
        use_rag: true,
        history: [],
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle chat error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        chatApi.sendMessage({
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
            value: new TextEncoder().encode('data: {"type": "content", "data": "你好"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "content", "data": "世界"}\n\n'),
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

      const onContent = jest.fn();
      const onDone = jest.fn();

      await chatApi.sendMessageStream(
        { message: '你好', use_rag: false, history: [] },
        { onContent, onDone }
      );

      expect(onContent).toHaveBeenCalledWith('你好');
      expect(onContent).toHaveBeenCalledWith('世界');
      expect(onDone).toHaveBeenCalled();
    });

    it('should get chat sessions', async () => {
      const mockSessions = {
        sessions: [
          { id: 'session-1', title: '会话1', created_at: '2024-01-01' },
          { id: 'session-2', title: '会话2', created_at: '2024-01-01' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSessions }),
      });

      const result = await chatApi.getSessions();

      expect(result).toEqual(mockSessions);
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
        json: async () => ({ success: true, data: mockDocument }),
      });

      const result = await documentApi.createDocument({
        title: '测试文档',
        content: '内容',
      });

      expect(result).toEqual(mockDocument);
    });

    it('should get documents list', async () => {
      const mockResponse = {
        items: [
          { id: '1', title: '文档1', content: '内容1', doc_type: 'text', metadata: {}, created_at: '2024-01-01' },
          { id: '2', title: '文档2', content: '内容2', doc_type: 'pdf', metadata: {}, created_at: '2024-01-01' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await documentApi.getDocuments();

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should upload file', async () => {
      const mockResponse = {
        id: 'doc-123',
        message: '上传成功',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = await documentApi.uploadFile(file);

      expect(result).toEqual(mockResponse);
    });

    it('should delete document', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });

      await documentApi.deleteDocument('doc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents/doc-123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should search documents', async () => {
      const mockResults = [
        { id: '1', title: '文档1', content: '内容', similarity: 0.95 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResults }),
      });

      const result = await documentApi.searchDocuments('测试', 5);

      expect(result).toEqual(mockResults);
    });
  });
});
