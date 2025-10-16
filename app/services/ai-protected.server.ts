import { CircuitBreakerManager, CircuitBreakerError } from './circuit-breaker.server.js';
import logger from '@/utils/logger';

/**
 * AI 服務保護層
 * 使用 Circuit Breaker 保護 AI 服務調用
 */
export class ProtectedAIService {
  private static circuitManager = CircuitBreakerManager.getInstance();

  /**
   * 受保護的 OpenAI 調用
   */
  static async callOpenAI<T>(operation: () => Promise<T>, operationName = 'openai-general'): Promise<T> {
    const breaker = this.circuitManager.getBreaker('openai', {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 秒恢復時間
      halfOpenMaxCalls: 2,
    });

    try {
      return await breaker.execute(operation);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        logger.error('OpenAI service unavailable due to circuit breaker', {
          operationName,
          state: error.state,
        });

        // 提供降級策略
        throw new AIServiceUnavailableError('AI 服務暫時無法使用，請稍後重試', 'openai', error.state);
      }

      // 記錄 AI 服務錯誤
      logger.error('OpenAI service error', {
        operationName,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 受保護的 Google AI 調用
   */
  static async callGoogleAI<T>(operation: () => Promise<T>, operationName = 'google-ai-general'): Promise<T> {
    const breaker = this.circuitManager.getBreaker('google-ai', {
      failureThreshold: 3,
      recoveryTimeout: 45000, // 45 秒恢復時間
      halfOpenMaxCalls: 1,
    });

    try {
      return await breaker.execute(operation);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        logger.error('Google AI service unavailable due to circuit breaker', {
          operationName,
          state: error.state,
        });

        throw new AIServiceUnavailableError('AI 服務暫時無法使用，請稍後重試', 'google-ai', error.state);
      }

      logger.error('Google AI service error', {
        operationName,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 多層次 AI 調用（帶備援機制）
   */
  static async callAIWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName = 'ai-with-fallback'
  ): Promise<T> {
    // 首先嘗試主要服務（通常是 Google AI）
    try {
      return await this.callGoogleAI(primaryOperation, `${operationName}-primary`);
    } catch (primaryError) {
      logger.warn('Primary AI service failed, trying fallback', {
        operationName,
        primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // 主要服務失敗，嘗試備援服務
      try {
        return await this.callOpenAI(fallbackOperation, `${operationName}-fallback`);
      } catch (fallbackError) {
        logger.error('Both AI services failed', {
          operationName,
          primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });

        // 如果都是熔斷錯誤，返回服務不可用
        if (primaryError instanceof AIServiceUnavailableError && fallbackError instanceof AIServiceUnavailableError) {
          throw new AIServiceUnavailableError('AI 服務暫時全部無法使用，系統正在恢復中', 'all-services', 'OPEN');
        }

        // 拋出最後一個錯誤
        throw fallbackError;
      }
    }
  }

  /**
   * 批次 AI 調用（帶限流）
   */
  static async batchAICall<T>(
    operations: (() => Promise<T>)[],
    options: {
      concurrency?: number;
      retryAttempts?: number;
      operationName?: string;
    } = {}
  ): Promise<(T | Error)[]> {
    const { concurrency = 3, retryAttempts = 2, operationName = 'batch-ai-call' } = options;

    logger.info('Starting batch AI operations', {
      totalOperations: operations.length,
      concurrency,
      operationName,
    });

    const results: (T | Error)[] = [];

    // 分批執行，避免同時發送過多請求
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);

      const batchPromises = batch.map(async (operation, index) => {
        for (let attempt = 0; attempt <= retryAttempts; attempt++) {
          try {
            return await this.callAIWithFallback(
              operation,
              operation, // 使用相同操作作為備援
              `${operationName}-item-${i + index}`
            );
          } catch (error) {
            if (attempt === retryAttempts) {
              logger.error('Batch operation failed after all attempts', {
                operationName,
                itemIndex: i + index,
                attempts: attempt + 1,
                error: error instanceof Error ? error.message : String(error),
              });
              return error instanceof Error ? error : new Error(String(error));
            }

            // 指數退避重試
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        // TypeScript 安全性：理論上不應該到達這裡
        return new Error('Unexpected: batch operation completed without result');
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 批次間添加小延遲，避免過載
      if (i + concurrency < operations.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter((r) => !(r instanceof Error)).length;
    const failureCount = results.length - successCount;

    logger.info('Batch AI operations completed', {
      operationName,
      totalOperations: operations.length,
      successCount,
      failureCount,
      successRate: `${((successCount / results.length) * 100).toFixed(1)}%`,
    });

    return results;
  }

  /**
   * 獲取所有 AI 服務的健康狀態
   */
  static getAIServicesHealth() {
    return this.circuitManager.getSystemHealth();
  }

  /**
   * 重置所有 AI 服務的熔斷器
   */
  static resetAllCircuitBreakers() {
    this.circuitManager.resetAll();
    logger.info('All AI service circuit breakers reset');
  }

  /**
   * 獲取詳細統計信息
   */
  static getDetailedStats() {
    return this.circuitManager.getAllStats();
  }
}

/**
 * AI 服務不可用錯誤
 */
export class AIServiceUnavailableError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly state: string
  ) {
    super(message);
    this.name = 'AIServiceUnavailableError';
  }
}

/**
 * AI 服務超時錯誤
 */
export class AIServiceTimeoutError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'AIServiceTimeoutError';
  }
}

/**
 * 創建帶超時的 AI 操作
 */
export function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, service: string): () => Promise<T> {
  return async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AIServiceTimeoutError(`AI 服務調用超時 (${timeoutMs}ms)`, service, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  };
}
