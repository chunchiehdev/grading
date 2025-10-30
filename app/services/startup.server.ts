import { MonitoringService } from './monitoring.server.js';
import { ChatCacheService } from './cache.server.js';
import { aiHandlerService } from './ai-handler.server.js';
import { ProtectedAIService } from './ai-protected.server.js';
import initializeGradingWorker from './worker-init.server.js';
import logger from '@/utils/logger';

const STARTUP_STATE_KEY = '__grading_startup_state__';

type StartupState = {
  initialized: boolean;
  initializationInProgress: boolean;
  gracefulShutdownRegistered: boolean;
};

type GlobalWithStartupState = typeof globalThis & {
  [STARTUP_STATE_KEY]?: StartupState;
};

const globalStartupState = globalThis as GlobalWithStartupState;

function getStartupState(): StartupState {
  if (!globalStartupState[STARTUP_STATE_KEY]) {
    globalStartupState[STARTUP_STATE_KEY] = {
      initialized: false,
      initializationInProgress: false,
      gracefulShutdownRegistered: false,
    };
  }
  return globalStartupState[STARTUP_STATE_KEY]!;
}

export class StartupService {
  static async initialize(): Promise<void> {
    const state = getStartupState();

    if (state.initialized) {
      return;
    }

    if (state.initializationInProgress) {
      logger.warn('StartupService initialization already in progress, waiting...');
      let attempts = 0;
      while (state.initializationInProgress && attempts < 100) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return;
    }

    state.initializationInProgress = true;
    logger.info('Initializing system components...');

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

      state.initialized = true;
      state.initializationInProgress = false;
      logger.info('✅ System initialization completed successfully');
    } catch (error) {
      logger.error('System initialization failed:', error);
      state.initializationInProgress = false;
      // 不拋出錯誤，允許應用程式繼續運行
      state.initialized = true; // 標記為已初始化以避免重複嘗試
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
   * 統一管理所有服務的關閉流程，包括 AI 服務和 BullMQ Worker
   */
  private static setupGracefulShutdown(): void {
    const state = getStartupState();
    if (state.gracefulShutdownRegistered) {
      return;
    }
    state.gracefulShutdownRegistered = true;

    const gracefulShutdown = async (signal: string) => {
      logger.info(`📋 Received ${signal}, starting graceful shutdown...`);

      try {
        // 1. 停止 AI 處理服務
        logger.info('⏳ Stopping AI Handler Service...');
        await aiHandlerService.stop();
        logger.info('✅ AI Handler Service stopped');

        // 2. 給 BullMQ Worker 時間完成當前處理的 jobs
        const gracePeriod = 10000; // 10 秒
        logger.info(`⏳ Grace period: ${gracePeriod}ms for running jobs to complete`);
        await new Promise((resolve) => setTimeout(resolve, gracePeriod));

        // 3. 關閉 BullMQ Worker 和相關服務
        logger.info('⏳ Closing BullMQ grading services...');
        const { closeGradingServices } = await import('./bullmq-grading.server.js');
        await closeGradingServices();
        logger.info('✅ BullMQ grading services closed');

        // 4. 清理快取（可選）
        // await ChatCacheService.clearAllCache();

        logger.info('✅ Graceful shutdown completed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // 註冊信號處理器
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 處理未捕獲的異常
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    logger.info('✅ Graceful shutdown handlers registered');
  }

  /**
   * 獲取系統初始化狀態
   */
  static isInitialized(): boolean {
    const state = getStartupState();
    return state.initialized;
  }
}
