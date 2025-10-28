import { MonitoringService } from './monitoring.server.js';
import { ChatCacheService } from './cache.server.js';
import { aiHandlerService } from './ai-handler.server.js';
import { ProtectedAIService } from './ai-protected.server.js';
import initializeGradingWorker from './worker-init.server.js';
import logger from '@/utils/logger';

/**
 * 系統啟動服務
 * 初始化所有性能優化組件和監控服務
 */
export class StartupService {
  private static initialized = false;
  private static initializationInProgress = false;

  /**
   * 初始化所有系統組件
   */
  static async initialize(): Promise<void> {
    // 雙重檢查鎖定模式，防止並發初始化
    if (this.initialized) {
      // 靜默跳過已初始化的情況，避免 SSR 請求產生大量日誌
      return;
    }

    if (this.initializationInProgress) {
      logger.warn('🔄 StartupService initialization already in progress, waiting...');
      // 等待初始化完成
      let attempts = 0;
      while (this.initializationInProgress && attempts < 100) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return;
    }

    this.initializationInProgress = true;
    logger.info('🚀 Initializing system components...');

    try {
      // 1. 初始化快取預熱（非關鍵）
      await this.initializeCacheWarmup();

      // 2. 啟動 AI 處理服務（關鍵服務）
      await this.initializeAIHandlerService();

      // 3. 初始化 Circuit Breakers（非關鍵）
      await this.initializeCircuitBreakers();

      // 4. 初始化 BullMQ Grading Worker（關鍵服務，用於 Gemini API rate limiting）
      await initializeGradingWorker();

      // 5. 啟動監控服務（非關鍵，暫時跳過）
      // await this.initializeMonitoringService();

      // 6. 設置優雅關閉處理
      this.setupGracefulShutdown();

      this.initialized = true;
      this.initializationInProgress = false;
      logger.info('✅ System initialization completed successfully');
    } catch (error) {
      logger.error('System initialization failed:', error);
      this.initializationInProgress = false;
      // 不拋出錯誤，允許應用程式繼續運行
      this.initialized = true; // 標記為已初始化以避免重複嘗試
    }
  }

  /**
   * 初始化快取預熱
   */
  private static async initializeCacheWarmup(): Promise<void> {
    try {
      logger.info('Starting cache warmup...');
      await ChatCacheService.warmupCache();
      logger.info('Cache warmup completed');
    } catch (error) {
      logger.error('Cache warmup failed:', error);
      // 非關鍵錯誤，繼續啟動
    }
  }

  /**
   * 啟動 AI 處理服務
   */
  private static async initializeAIHandlerService(): Promise<void> {
    try {
      logger.info('🤖 Starting AI Handler Service...');
      await aiHandlerService.start();
      logger.info('✅ AI Handler Service started successfully');
    } catch (error) {
      logger.error('❌ Failed to start AI Handler Service:', error);
      throw error; // AI 服務是關鍵組件，啟動失敗應該停止系統
    }
  }

  /**
   * 初始化 Circuit Breakers
   */
  private static async initializeCircuitBreakers(): Promise<void> {
    try {
      logger.info('Initializing Circuit Breakers...');

      // 重置所有熔斷器到初始狀態
      ProtectedAIService.resetAllCircuitBreakers();

      // 獲取初始狀態
      const initialHealth = ProtectedAIService.getAIServicesHealth();
      logger.info('Circuit Breakers initialized', {
        totalBreakers: initialHealth.totalBreakers,
        healthyBreakers: initialHealth.healthyBreakers,
      });
    } catch (error) {
      logger.error('Failed to initialize Circuit Breakers:', error);
      // 非關鍵錯誤，Circuit Breakers 可以運行時初始化
    }
  }

  /**
   * 啟動監控服務
   */
  private static async initializeMonitoringService(): Promise<void> {
    try {
      logger.info('Starting monitoring service...');

      // 收集初始指標
      await MonitoringService.collectSystemMetrics();

      // 開始定期指標收集 (5分鐘間隔)
      MonitoringService.startMetricsCollection(5 * 60 * 1000);

      logger.info('Monitoring service started');
    } catch (error) {
      logger.error('Failed to start monitoring service:', error);
      // 監控是非關鍵服務，不影響主要功能
    }
  }

  /**
   * 設置優雅關閉處理
   */
  private static setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // 停止 AI 處理服務
        await aiHandlerService.stop();
        logger.info('AI Handler Service stopped');

        // 清理快取（可選）
        // await ChatCacheService.clearAllCache();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // 註冊信號處理器
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 處理未捕獲的異常
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    logger.info('Graceful shutdown handlers registered');
  }

  /**
   * 獲取系統初始化狀態
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 執行健康檢查
   */
  static async healthCheck(): Promise<HealthCheckResult> {
    try {
      const [systemStatus, aiServicesHealth, cacheStats] = await Promise.all([
        MonitoringService.getSystemStatusSummary(),
        ProtectedAIService.getAIServicesHealth(),
        ChatCacheService.getCacheStats(),
      ]);

      const allHealthy = systemStatus.healthy && aiServicesHealth.healthy && this.initialized;

      return {
        healthy: allHealthy,
        timestamp: Date.now(),
        components: {
          system: {
            healthy: this.initialized,
            details: 'System initialization status',
          },
          database: {
            healthy: systemStatus.metrics.totalUsers >= 0,
            details: `${systemStatus.metrics.totalUsers} total users`,
          },
          aiServices: {
            healthy: aiServicesHealth.healthy,
            details: `${aiServicesHealth.healthyBreakers}/${aiServicesHealth.totalBreakers} services healthy`,
          },
          cache: {
            healthy: cacheStats !== null,
            details: cacheStats ? 'Cache operational' : 'Cache unavailable',
          },
          monitoring: {
            healthy: systemStatus.timestamp > 0,
            details: 'Monitoring service operational',
          },
        },
        metrics: systemStatus.metrics,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        healthy: false,
        timestamp: Date.now(),
        components: {
          system: { healthy: false, details: 'Health check failed' },
        },
        metrics: {
          totalUsers: 0,
          activeUsers: 0,
          totalChats: 0,
          messagesLastHour: 0,
          aiServicesHealthy: false,
          memoryUsageMB: 0,
          uptime: 0,
        },
      };
    }
  }

  /**
   * 強制重新初始化（開發/測試用）
   */
  static async forceReinitialize(): Promise<void> {
    logger.warn('Force reinitializing system components...');
    this.initialized = false;
    await this.initialize();
  }
}

interface HealthCheckResult {
  healthy: boolean;
  timestamp: number;
  components: Record<
    string,
    {
      healthy: boolean;
      details: string;
    }
  >;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalChats: number;
    messagesLastHour: number;
    aiServicesHealthy: boolean;
    memoryUsageMB: number;
    uptime: number;
  };
}
