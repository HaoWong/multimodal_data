/**
 * API 错误类 - 统一错误处理
 */
export class APIError extends Error {
  public readonly code: number | string;
  public readonly status?: number;
  public readonly data?: any;
  public readonly isNetworkError: boolean;
  public readonly isCancelled: boolean;

  constructor(
    message: string,
    code: number | string = 'UNKNOWN_ERROR',
    status?: number,
    data?: any,
    isNetworkError: boolean = false,
    isCancelled: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
    this.isCancelled = isCancelled;

    // 确保 instanceof 正常工作
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * 是否为客户端错误 (4xx)
   */
  get isClientError(): boolean {
    return this.status !== undefined && this.status >= 400 && this.status < 500;
  }

  /**
   * 是否为服务器错误 (5xx)
   */
  get isServerError(): boolean {
    return this.status !== undefined && this.status >= 500;
  }

  /**
   * 是否为认证错误 (401)
   */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * 是否为权限错误 (403)
   */
  get isPermissionError(): boolean {
    return this.status === 403;
  }

  /**
   * 是否为资源不存在 (404)
   */
  get isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * 从 axios 错误创建 APIError
   */
  static fromAxiosError(error: any): APIError {
    if (error.response) {
      // 服务器返回了错误响应
      const { status, data } = error.response;
      const message = data?.message || data?.detail || `请求失败: ${status}`;
      const code = data?.code || `HTTP_${status}`;
      return new APIError(message, code, status, data);
    } else if (error.request) {
      // 请求发出但没有收到响应
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return new APIError('请求超时，请稍后重试', 'TIMEOUT', undefined, undefined, true);
      }
      return new APIError('无法连接到服务器，请检查网络', 'NETWORK_ERROR', undefined, undefined, true);
    } else if (error.message === 'canceled' || error.__CANCEL__) {
      // 请求被取消
      return new APIError('请求已取消', 'CANCELLED', undefined, undefined, false, true);
    } else {
      // 其他错误
      return new APIError(error.message || '发生未知错误', 'UNKNOWN_ERROR');
    }
  }

  /**
   * 创建取消错误
   */
  static cancelled(message: string = '请求已取消'): APIError {
    return new APIError(message, 'CANCELLED', undefined, undefined, false, true);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      data: this.data,
      isNetworkError: this.isNetworkError,
      isCancelled: this.isCancelled,
    };
  }
}
