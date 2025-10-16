/**
 * 統一的API回應格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

/**
 * API錯誤類型
 */
export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * 輔助函數：創建成功回應
 */
export function createSuccessResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * 輔助函數：創建錯誤回應
 */
export function createErrorResponse(message: string, code?: ApiErrorCode, details?: any): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details }),
    },
  };
}

/**
 * 輔助函數：創建分頁成功回應
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number = 1,
  limit: number = 20
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
