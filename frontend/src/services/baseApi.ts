import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  Canceler,
  CancelTokenStatic,
  InternalAxiosRequestConfig,
} from 'axios';
import { APIError } from './APIError';

/**
 * 后端统一响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  code?: number | string;
}

/**
 * 分页数据格式
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 分页响应
 */
export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

/**
 * 请求拦截器类型
 */
export type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

/**
 * 响应拦截器类型
 */
export type ResponseInterceptor<T = any> = (
  response: AxiosResponse<T>
) => AxiosResponse<T> | Promise<AxiosResponse<T>>;

/**
 * 错误拦截器类型
 */
export type ErrorInterceptor = (error: any) => any;

/**
 * 流式回调
 */
export interface StreamCallbacks<T = any> {
  onData: (data: T) => void;
  onError?: (error: APIError) => void;
  onDone?: () => void;
}

/**
 * SSE 消息解析器
 */
export type SSEMessageParser<T> = (line: string) => T | null;

/**
 * BaseApiService 配置选项
 */
export interface BaseApiServiceOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * 基础 API 服务类
 * 提供统一的请求配置、错误处理、响应解析、拦截器和请求取消功能
 */
export class BaseApiService {
  protected readonly axiosInstance: AxiosInstance;
  protected readonly cancelToken: CancelTokenStatic;
  protected pendingRequests: Map<string, Canceler>;
  protected baseURL: string;

  constructor(options: BaseApiServiceOptions) {
    this.baseURL = options.baseURL;
    this.cancelToken = axios.CancelToken;
    this.pendingRequests = new Map();

    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    this.setupDefaultInterceptors();
  }

  /**
   * 设置默认拦截器
   */
  protected setupDefaultInterceptors(): void {
    // 请求拦截器 - 日志记录
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] 请求错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 统一错误处理
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[API] 响应错误:', error.response?.data || error.message);
        return Promise.reject(APIError.fromAxiosError(error));
      }
    );
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(
    onFulfilled?: RequestInterceptor,
    onRejected?: ErrorInterceptor
  ): number {
    return this.axiosInstance.interceptors.request.use(onFulfilled, onRejected);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor<T = any>(
    onFulfilled?: ResponseInterceptor<T>,
    onRejected?: ErrorInterceptor
  ): number {
    return this.axiosInstance.interceptors.response.use(onFulfilled, onRejected);
  }

  /**
   * 移除请求拦截器
   */
  removeRequestInterceptor(interceptorId: number): void {
    this.axiosInstance.interceptors.request.eject(interceptorId);
  }

  /**
   * 移除响应拦截器
   */
  removeResponseInterceptor(interceptorId: number): void {
    this.axiosInstance.interceptors.response.eject(interceptorId);
  }

  /**
   * 生成请求唯一标识
   */
  protected generateRequestKey(config: AxiosRequestConfig): string {
    return `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`;
  }

  /**
   * 创建可取消的请求配置
   */
  protected createCancelableConfig(
    config: AxiosRequestConfig,
    requestKey?: string
  ): AxiosRequestConfig {
    const key = requestKey || this.generateRequestKey(config);

    // 取消之前的相同请求
    this.cancelRequest(key);

    const source = this.cancelToken.source();
    this.pendingRequests.set(key, source.cancel);

    return {
      ...config,
      cancelToken: source.token,
    };
  }

  /**
   * 取消指定请求
   */
  cancelRequest(requestKey: string, message?: string): void {
    const canceler = this.pendingRequests.get(requestKey);
    if (canceler) {
      canceler(message || '请求被取消');
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * 取消所有待处理请求
   */
  cancelAllRequests(message?: string): void {
    this.pendingRequests.forEach((canceler) => {
      canceler(message || '所有请求被取消');
    });
    this.pendingRequests.clear();
  }

  /**
   * 解析后端统一响应格式
   */
  protected parseResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const { data } = response;

    if (!data.success) {
      throw new APIError(
        data.message || data.error || '请求失败',
        data.code || 'API_ERROR',
        response.status,
        data
      );
    }

    return data.data;
  }

  /**
   * GET 请求
   */
  async get<T>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig,
    cancelable: boolean = false
  ): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method: 'GET',
      url,
      params,
    };

    const finalConfig = cancelable
      ? this.createCancelableConfig(requestConfig)
      : requestConfig;

    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>(finalConfig);
      return this.parseResponse<T>(response);
    } catch (error) {
      if (axios.isCancel(error)) {
        throw APIError.cancelled();
      }
      throw error instanceof APIError ? error : APIError.fromAxiosError(error);
    }
  }

  /**
   * POST 请求
   */
  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    cancelable: boolean = false
  ): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method: 'POST',
      url,
      data,
    };

    const finalConfig = cancelable
      ? this.createCancelableConfig(requestConfig)
      : requestConfig;

    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>(finalConfig);
      return this.parseResponse<T>(response);
    } catch (error) {
      if (axios.isCancel(error)) {
        throw APIError.cancelled();
      }
      throw error instanceof APIError ? error : APIError.fromAxiosError(error);
    }
  }

  /**
   * PUT 请求
   */
  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    cancelable: boolean = false
  ): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method: 'PUT',
      url,
      data,
    };

    const finalConfig = cancelable
      ? this.createCancelableConfig(requestConfig)
      : requestConfig;

    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>(finalConfig);
      return this.parseResponse<T>(response);
    } catch (error) {
      if (axios.isCancel(error)) {
        throw APIError.cancelled();
      }
      throw error instanceof APIError ? error : APIError.fromAxiosError(error);
    }
  }

  /**
   * PATCH 请求
   */
  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    cancelable: boolean = false
  ): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method: 'PATCH',
      url,
      data,
    };

    const finalConfig = cancelable
      ? this.createCancelableConfig(requestConfig)
      : requestConfig;

    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>(finalConfig);
      return this.parseResponse<T>(response);
    } catch (error) {
      if (axios.isCancel(error)) {
        throw APIError.cancelled();
      }
      throw error instanceof APIError ? error : APIError.fromAxiosError(error);
    }
  }

  /**
   * DELETE 请求
   */
  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
    cancelable: boolean = false
  ): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method: 'DELETE',
      url,
    };

    const finalConfig = cancelable
      ? this.createCancelableConfig(requestConfig)
      : requestConfig;

    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>(finalConfig);
      return this.parseResponse<T>(response);
    } catch (error) {
      if (axios.isCancel(error)) {
        throw APIError.cancelled();
      }
      throw error instanceof APIError ? error : APIError.fromAxiosError(error);
    }
  }

  /**
   * 文件上传
   */
  async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    additionalData?: Record<string, any>,
    timeout: number = 60000
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
    }

    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>({
        method: 'POST',
        url,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return this.parseResponse<T>(response);
    } catch (error) {
      throw error instanceof APIError ? error : APIError.fromAxiosError(error);
    }
  }

  /**
   * 流式请求 (SSE)
   */
  async stream<T>(
    url: string,
    data: any,
    callbacks: StreamCallbacks<T>,
    messageParser?: SSEMessageParser<T>
  ): Promise<void> {
    const controller = new AbortController();

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new APIError(`HTTP ${response.status}: ${response.statusText}`, `HTTP_${response.status}`);
      }

      if (!response.body) {
        throw new APIError('响应体为空', 'EMPTY_BODY');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          callbacks.onDone?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            if (dataStr === '[DONE]') {
              callbacks.onDone?.();
              return;
            }

            try {
              let parsed: T;
              if (messageParser) {
                const result = messageParser(line);
                if (result === null) continue;
                parsed = result;
              } else {
                parsed = JSON.parse(dataStr);
              }
              callbacks.onData(parsed);
            } catch (e) {
              console.error('[SSE] 解析消息失败:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw APIError.cancelled();
      }

      const apiError = error instanceof APIError ? error : APIError.fromAxiosError(error);
      callbacks.onError?.(apiError);
      throw apiError;
    }
  }

  /**
   * 获取原始 axios 实例（用于高级自定义）
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

/**
 * 创建 BaseApiService 实例的工厂函数
 */
export function createBaseApiService(options: BaseApiServiceOptions): BaseApiService {
  return new BaseApiService(options);
}
