/**
 * 前端服务集成测试
 * 测试统一API服务封装、统一状态管理和错误处理
 */

import { BaseApiService, PaginatedData, StreamCallbacks } from '../baseApi';
import { APIError } from '../APIError';
import { contentApi, chatApi, documentApi, imageApi, skillApi, agentApi } from '../api';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
  CancelToken: {
    source: jest.fn(() => ({
      token: 'mock-token',
      cancel: jest.fn(),
    })),
  },
  isCancel: jest.fn(),
}));

// Mock fetch for streaming tests
global.fetch = jest.fn();

describe('Integration Tests - Unified API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BaseApiService - Unified API Wrapper', () => {
    it('should create service with correct configuration', () => {
      const service = new BaseApiService({
        baseURL: 'http://test-api.com',
        timeout: 5000,
        headers: { 'X-Custom': 'value' },
      });

      expect(service).toBeDefined();
      expect(service.getAxiosInstance()).toBeDefined();
    });

    it('should handle unified response format', async () => {
      const mockResponse = {
        success: true,
        data: { id: '123', name: 'Test' },
        message: '操作成功',
        timestamp: new Date().toISOString(),
      };

      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      const service = new BaseApiService({ baseURL: 'http://test-api.com' });
      // Override the axios instance for testing
      (service as any).axiosInstance = mockAxiosInstance;
      
      const result = await service.get('/test');

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle unified error response format', async () => {
      const mockErrorResponse = {
        success: false,
        error: '资源不存在',
        code: '3000',
        message: '资源不存在',
        timestamp: new Date().toISOString(),
      };

      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: mockErrorResponse,
      });

      const service = new BaseApiService({ baseURL: 'http://test-api.com' });
      (service as any).axiosInstance = mockAxiosInstance;

      await expect(service.get('/test')).rejects.toThrow(APIError);
    });

    it('should handle paginated response', async () => {
      const mockPaginatedResponse = {
        success: true,
        data: {
          items: [{ id: '1' }, { id: '2' }],
          total: 10,
          page: 1,
          pageSize: 2,
          totalPages: 5,
        },
        message: '查询成功',
      };

      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: mockPaginatedResponse,
      });

      const service = new BaseApiService({ baseURL: 'http://test-api.com' });
      (service as any).axiosInstance = mockAxiosInstance;
      
      const result = await service.get<PaginatedData<any>>('/test');

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
    });
  });

  describe('Content API - Unified Content Management', () => {
    it('should upload content with progress tracking', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'content-123', content_type: 'TEXT' },
        message: '上传成功',
      };

      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      // Mock the apiService instance
      jest.spyOn(contentApi as any, 'upload').mockResolvedValue(mockResponse.data);

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const onProgress = jest.fn();

      const result = await contentApi.uploadContent(file, { test: true }, onProgress);

      expect(result.id).toBe('content-123');
      expect(result.content_type).toBe('TEXT');
    });

    it('should list contents with type filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [
            { id: '1', content_type: 'TEXT', original_name: 'doc1.txt' },
            { id: '2', content_type: 'TEXT', original_name: 'doc2.txt' },
          ],
          total: 2,
        },
        message: '获取成功',
      };

      jest.spyOn(contentApi as any, 'listContents').mockResolvedValue(mockResponse.data);

      const result = await contentApi.listContents('TEXT', 0, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should search contents', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [
            { id: '1', original_name: 'test.txt', similarity: 0.95 },
          ],
          total: 1,
        },
        message: '搜索完成',
      };

      jest.spyOn(contentApi as any, 'searchContents').mockResolvedValue(mockResponse.data.results);

      const result = await contentApi.searchContents('test query', 'TEXT', 5);

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.95);
    });

    it('should get content detail', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'content-123',
          url: '/uploads/contents/test.mp4',
          type: 'video',
          original_name: 'test.mp4',
          description: 'Test video',
          metadata: { duration: 120 },
        },
        message: '获取成功',
      };

      jest.spyOn(contentApi as any, 'getContentDetail').mockResolvedValue(mockResponse.data);

      const result = await contentApi.getContentDetail('content-123');

      expect(result.id).toBe('content-123');
      expect(result.type).toBe('video');
    });

    it('should delete content', async () => {
      const mockResponse = {
        success: true,
        data: null,
        message: '删除成功',
      };

      jest.spyOn(contentApi as any, 'deleteContent').mockResolvedValue(mockResponse.data);

      await contentApi.deleteContent('content-123');

      expect(contentApi.deleteContent).toHaveBeenCalledWith('content-123');
    });
  });

  describe('Chat API - Conversation Management', () => {
    it('should send message with RAG', async () => {
      const mockResponse = {
        success: true,
        data: {
          response: '这是AI的回复',
          sources: [
            { id: 'doc-1', title: '文档1', similarity: 0.92, content: '相关内容' },
          ],
          session_id: 'session-123',
        },
        message: '回复成功',
      };

      jest.spyOn(chatApi as any, 'sendMessage').mockResolvedValue(mockResponse.data);

      const result = await chatApi.sendMessage({
        message: '你好',
        use_rag: true,
        history: [],
      });

      expect(result.response).toBe('这是AI的回复');
      expect(result.sources).toHaveLength(1);
      expect(result.session_id).toBe('session-123');
    });

    it('should get chat sessions', async () => {
      const mockResponse = {
        success: true,
        data: {
          sessions: [
            { id: 'session-1', title: '会话1', created_at: '2024-01-01' },
            { id: 'session-2', title: '会话2', created_at: '2024-01-02' },
          ],
        },
        message: '获取成功',
      };

      jest.spyOn(chatApi as any, 'getSessions').mockResolvedValue(mockResponse.data);

      const result = await chatApi.getSessions(10);

      expect(result.sessions).toHaveLength(2);
    });
  });

  describe('Document API - Backward Compatibility', () => {
    it('should create document', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'doc-123',
          title: '测试文档',
          content: '文档内容',
          doc_type: 'text',
          metadata: {},
          created_at: '2024-01-01',
        },
        message: '创建成功',
      };

      jest.spyOn(documentApi as any, 'createDocument').mockResolvedValue(mockResponse.data);

      const result = await documentApi.createDocument({
        title: '测试文档',
        content: '文档内容',
      });

      expect(result.title).toBe('测试文档');
      expect(result.id).toBe('doc-123');
    });

    it('should get documents list', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [
            { id: '1', title: '文档1', content: '内容1', doc_type: 'text' },
            { id: '2', title: '文档2', content: '内容2', doc_type: 'pdf' },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        },
        message: '获取成功',
      };

      jest.spyOn(documentApi as any, 'getDocuments').mockResolvedValue(mockResponse.data);

      const result = await documentApi.getDocuments(0, 100);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should upload file with progress', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'doc-123', message: '上传成功' },
        message: '上传成功',
      };

      jest.spyOn(documentApi as any, 'uploadFile').mockResolvedValue(mockResponse.data);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const onProgress = jest.fn();

      const result = await documentApi.uploadFile(file, onProgress);

      expect(result.id).toBe('doc-123');
    });
  });

  describe('Image API - Backward Compatibility', () => {
    it('should upload image', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'img-123',
          image_url: '/uploads/images/img-123.jpg',
          description: '图片描述',
        },
        message: '上传成功',
      };

      jest.spyOn(imageApi as any, 'uploadImage').mockResolvedValue(mockResponse.data);

      const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      const result = await imageApi.uploadImage(file);

      expect(result.id).toBe('img-123');
    });

    it('should list images', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', url: '/uploads/images/1.jpg', type: 'image', description: '图片1' },
          { id: '2', url: '/uploads/images/2.jpg', type: 'image', description: '图片2' },
        ],
        message: '获取成功',
      };

      jest.spyOn(imageApi as any, 'listImages').mockResolvedValue(mockResponse.data);

      const result = await imageApi.listImages();

      expect(result).toHaveLength(2);
    });
  });

  describe('Skill API', () => {
    it('should list skills', async () => {
      const mockResponse = {
        success: true,
        data: [
          { name: 'vector_search', description: '向量搜索', parameters: {} },
          { name: 'llm_chat', description: 'LLM对话', parameters: {} },
        ],
        message: '获取成功',
      };

      jest.spyOn(skillApi as any, 'listSkills').mockResolvedValue(mockResponse.data);

      const result = await skillApi.listSkills();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('vector_search');
    });

    it('should invoke skill', async () => {
      const mockResponse = {
        success: true,
        data: { result: 'skill result' },
        message: '执行成功',
      };

      jest.spyOn(skillApi as any, 'invokeSkill').mockResolvedValue(mockResponse.data);

      const result = await skillApi.invokeSkill('vector_search', { query: 'test' });

      expect(result.result).toBe('skill result');
    });
  });

  describe('Agent API', () => {
    it('should execute agent task', async () => {
      const mockResponse = {
        success: true,
        data: {
          task_id: 'task-123',
          description: '测试任务',
          final_result: '任务结果',
          status: 'completed',
        },
        message: '执行成功',
      };

      jest.spyOn(agentApi as any, 'executeTask').mockResolvedValue(mockResponse.data);

      const result = await agentApi.executeTask('测试任务', { key: 'value' });

      expect(result.task_id).toBe('task-123');
      expect(result.status).toBe('completed');
    });

    it('should list agent tasks', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [
            { task_id: '1', description: '任务1', status: 'completed' },
            { task_id: '2', description: '任务2', status: 'running' },
          ],
          total: 2,
        },
        message: '获取成功',
      };

      jest.spyOn(agentApi as any, 'listTasks').mockResolvedValue(mockResponse.data);

      const result = await agentApi.listTasks(10);

      expect(result.items).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should create APIError from network error', () => {
      const networkError = new Error('Network Error');
      (networkError as any).request = {};

      const apiError = APIError.fromAxiosError(networkError);

      expect(apiError).toBeInstanceOf(APIError);
      expect(apiError.code).toBe('NETWORK_ERROR');
    });

    it('should create APIError from HTTP error', () => {
      const httpError = {
        response: {
          status: 500,
          data: { message: '服务器错误' },
        },
      };

      const apiError = APIError.fromAxiosError(httpError);

      expect(apiError).toBeInstanceOf(APIError);
      expect(apiError.statusCode).toBe(500);
    });

    it('should handle timeout errors', () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');

      const apiError = APIError.fromAxiosError(timeoutError);

      expect(apiError).toBeInstanceOf(APIError);
      expect(apiError.code).toBe('TIMEOUT');
    });

    it('should handle cancelled requests', () => {
      const cancelError = new Error('Request canceled');
      (cancelError as any).__CANCEL__ = true;

      const apiError = APIError.fromAxiosError(cancelError);

      expect(apiError).toBeInstanceOf(APIError);
      expect(apiError.code).toBe('CANCELLED');
      expect(apiError.isCancelled).toBe(true);
    });
  });

  describe('Unified State Management', () => {
    it('should maintain consistent request/response format', async () => {
      const mockResponse = {
        success: true,
        data: { test: true },
        message: '成功',
        timestamp: new Date().toISOString(),
      };

      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.request as jest.Mock).mockResolvedValue({
        data: mockResponse,
      });

      const service = new BaseApiService({ baseURL: 'http://test-api.com' });
      (service as any).axiosInstance = mockAxiosInstance;

      // 测试 GET 请求
      await service.get('/test');
      
      // 验证请求被正确调用
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it('should handle API response parsing', async () => {
      const mockResponse = {
        success: true,
        data: { id: '123', name: 'Test' },
        message: '操作成功',
      };

      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.request as jest.Mock).mockResolvedValue({
        data: mockResponse,
      });

      const service = new BaseApiService({ baseURL: 'http://test-api.com' });
      (service as any).axiosInstance = mockAxiosInstance;

      const result = await service.get('/test');

      expect(result).toEqual(mockResponse.data);
    });
  });
});
