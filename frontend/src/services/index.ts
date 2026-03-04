/**
 * API Services 统一导出
 *
 * 使用示例:
 * ```typescript
 * import { contentApi, chatApi, APIError, apiService } from '@/services';
 *
 * // 使用 API
 * const contents = await contentApi.listContents();
 *
 * // 错误处理
 * try {
 *   await contentApi.getContentDetail('invalid-id');
 * } catch (error) {
 *   if (error instanceof APIError) {
 *     if (error.isNotFoundError) {
 *       console.log('内容不存在');
 *     }
 *   }
 * }
 *
 * // 使用 BaseApiService 创建自定义 API
 * import { BaseApiService } from '@/services';
 * const customApi = new BaseApiService({ baseURL: 'http://api.example.com' });
 * ```
 */

// 导出 API 错误类
export { APIError } from './APIError';

// 导出基础 API 服务类和类型
export {
  BaseApiService,
  createBaseApiService,
  type ApiResponse,
  type PaginatedData,
  type PaginatedResponse,
  type RequestInterceptor,
  type ResponseInterceptor,
  type ErrorInterceptor,
  type StreamCallbacks,
  type SSEMessageParser,
  type BaseApiServiceOptions,
} from './baseApi';

// 导出 API 实例和 API 分组
export {
  // API 服务实例
  apiService,
  API_BASE_URL,

  // 文档 API
  documentApi,
  type Document,

  // 对话 API
  chatApi,
  type ChatMessage,
  type ChatResponse,
  type ChatStreamCallbacks,
  type MessageSource,

  // 图片 API
  imageApi,
  type MediaItem,
  type MediaDetail,

  // 统一内容 API
  contentApi,
  type ContentItem,

  // Skill API
  skillApi,
  type Skill,

  // Agent API
  agentApi,
  type AgentTask,
  type AgentTaskDetail,
} from './api';

// 默认导出 apiService 实例
export { apiService as default } from './api';
