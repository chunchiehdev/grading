import logger from '@/utils/logger';

/**
 * Circuit Breaker 狀態
 */
enum CircuitState {
  CLOSED = 'CLOSED', // 正常狀態，允許請求通過
  OPEN = 'OPEN', // 熔斷狀態，拒絕所有請求
  HALF_OPEN = 'HALF_OPEN', // 半開狀態，允許少量請求通過以測試服務恢復
}

/**
 * Circuit Breaker 配置
 */
interface CircuitBreakerConfig {
  failureThreshold: number; // 失敗閾值
  recoveryTimeout: number; // 恢復超時時間（毫秒）
  monitoringPeriod: number; // 監控週期（毫秒）
  halfOpenMaxCalls: number; // 半開狀態最大調用次數
}

/**
 * Circuit Breaker 統計數據
 */
interface CircuitBreakerStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  state: CircuitState;
}

/**
 * Circuit Breaker 實現
 * 用於保護外部服務調用，防止雪崩效應
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private stats: CircuitBreakerStats;
  private nextAttempt: number = 0;
  private halfOpenCalls: number = 0;

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: 5, // 5 次連續失敗後熔斷
      recoveryTimeout: 60000, // 60 秒後嘗試恢復
      monitoringPeriod: 300000, // 5 分鐘監控週期
      halfOpenMaxCalls: 3, // 半開狀態最多 3 次調用
      ...config,
    };

    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      consecutiveFailures: 0,
      lastFailureTime: null,
      state: CircuitState.CLOSED,
    };

    logger.info({ config: this.config }, `Circuit breaker initialized: ${name}`);
  }

  /**
   * 執行受保護的操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const error = new CircuitBreakerError(`Circuit breaker ${this.name} is ${this.stats.state}`, this.stats.state);
      logger.warn({
        name: this.name,
        state: this.stats.state,
        stats: this.getStats(),
      }, 'Circuit breaker blocked request');
      throw error;
    }

    const startTime = Date.now();
    this.stats.totalCalls++;

    try {
      const result = await operation();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(Date.now() - startTime, error);
      throw error;
    }
  }

  /**
   * 檢查是否可以執行操作
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.stats.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (now >= this.nextAttempt) {
          this.stats.state = CircuitState.HALF_OPEN;
          this.halfOpenCalls = 0;
          logger.info(`Circuit breaker ${this.name} transitioned to HALF_OPEN`);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return this.halfOpenCalls < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * 處理成功調用
   */
  private onSuccess(duration: number): void {
    this.stats.successfulCalls++;
    this.stats.consecutiveFailures = 0;

    if (this.stats.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;

      // 如果半開狀態下的調用都成功，恢復到關閉狀態
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.stats.state = CircuitState.CLOSED;
        logger.info(`Circuit breaker ${this.name} recovered to CLOSED state`);
      }
    }

    logger.debug({
      duration,
      state: this.stats.state,
      consecutiveFailures: this.stats.consecutiveFailures,
    }, `Circuit breaker ${this.name} - successful call`);
  }

  /**
   * 處理失敗調用
   */
  private onFailure(duration: number, error: any): void {
    this.stats.failedCalls++;
    this.stats.consecutiveFailures++;
    this.stats.lastFailureTime = Date.now();

    logger.warn({
      duration,
      error: error.message,
      consecutiveFailures: this.stats.consecutiveFailures,
      state: this.stats.state,
    }, `Circuit breaker ${this.name} - failed call`);

    if (this.stats.state === CircuitState.HALF_OPEN) {
      // 半開狀態下失敗，直接回到開啟狀態
      this.tripCircuit();
    } else if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
      // 連續失敗達到閾值，觸發熔斷
      this.tripCircuit();
    }
  }

  /**
   * 觸發熔斷
   */
  private tripCircuit(): void {
    this.stats.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.recoveryTimeout;

    logger.error({
      consecutiveFailures: this.stats.consecutiveFailures,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
      stats: this.getStats(),
    }, `Circuit breaker ${this.name} TRIPPED - service unavailable`);
  }

  /**
   * 獲取當前統計數據
   */
  getStats(): CircuitBreakerStats & { name: string; config: CircuitBreakerConfig } {
    return {
      name: this.name,
      config: this.config,
      ...this.stats,
    };
  }

  /**
   * 獲取健康狀態
   */
  getHealthStatus(): {
    healthy: boolean;
    state: CircuitState;
    successRate: number;
    recentErrors: number;
  } {
    const successRate = this.stats.totalCalls > 0 ? (this.stats.successfulCalls / this.stats.totalCalls) * 100 : 100;

    return {
      healthy: this.stats.state === CircuitState.CLOSED,
      state: this.stats.state,
      successRate: Number(successRate.toFixed(2)),
      recentErrors: this.stats.consecutiveFailures,
    };
  }

  /**
   * 手動重置 Circuit Breaker
   */
  reset(): void {
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      consecutiveFailures: 0,
      lastFailureTime: null,
      state: CircuitState.CLOSED,
    };

    this.halfOpenCalls = 0;
    this.nextAttempt = 0;

    logger.info(`Circuit breaker ${this.name} manually reset`);
  }

  /**
   * 強制開啟熔斷器（測試用）
   */
  forceOpen(): void {
    this.stats.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    logger.warn(`Circuit breaker ${this.name} force opened`);
  }

  /**
   * 強制關閉熔斷器（測試用）
   */
  forceClose(): void {
    this.stats.state = CircuitState.CLOSED;
    this.stats.consecutiveFailures = 0;
    this.halfOpenCalls = 0;
    logger.warn(`Circuit breaker ${this.name} force closed`);
  }
}

/**
 * Circuit Breaker 專用錯誤
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker 管理器
 * 統一管理多個 Circuit Breaker 實例
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers = new Map<string, CircuitBreaker>();

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * 獲取或創建 Circuit Breaker
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * 獲取所有 Circuit Breaker 的狀態
   */
  getAllStats(): Array<ReturnType<CircuitBreaker['getStats']>> {
    return Array.from(this.breakers.values()).map((breaker) => breaker.getStats());
  }

  /**
   * 獲取系統健康狀態
   */
  getSystemHealth(): {
    healthy: boolean;
    totalBreakers: number;
    healthyBreakers: number;
    details: Array<ReturnType<CircuitBreaker['getHealthStatus']> & { name: string }>;
  } {
    const details = Array.from(this.breakers.entries()).map(([name, breaker]) => ({
      name,
      ...breaker.getHealthStatus(),
    }));

    const healthyBreakers = details.filter((d) => d.healthy).length;

    return {
      healthy: healthyBreakers === details.length,
      totalBreakers: details.length,
      healthyBreakers,
      details,
    };
  }

  /**
   * 重置所有 Circuit Breaker
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
    logger.info('All circuit breakers reset');
  }
}
