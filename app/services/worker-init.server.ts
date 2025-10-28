import logger from '@/utils/logger';
import { gradingWorker, closeGradingServices } from './bullmq-grading.server';

/**
 * Initialize BullMQ worker
 *
 * This should be called once during app startup (server-side only)
 * The worker will continuously process jobs from the Redis queue
 *
 * Important: This should NOT run in SSR/client environments
 */
export async function initializeGradingWorker() {
  // Only initialize on server-side, not in SSR or client
  if (typeof window !== 'undefined') {
    logger.warn('[Worker Init] Skipping initialization in browser environment');
    return;
  }

  try {
    logger.info('🚀 [Worker Init] Starting BullMQ grading worker...');
    console.log('[Worker Init] Importing BullMQ grading service...');

    // Import the BullMQ service to trigger initialization
    const bullmq = await import('./bullmq-grading.server');
    console.log('[Worker Init] BullMQ service imported');

    // The worker is already instantiated in bullmq-grading.server.ts
    // This function is mainly for logging and error handling

    // Log initial status
    try {
      const worker = bullmq.worker || bullmq.gradingWorker;
      const isReady = worker?.isRunning?.();
      logger.info(`✅ [Worker Init] Grading worker is ${isReady ? 'running' : 'initializing'}`);
      console.log('[Worker Init] Worker status:', isReady ? 'running' : 'initializing');
    } catch (e) {
      logger.warn('[Worker Init] Could not check worker status');
      console.log('[Worker Init] Worker check skipped (might not be initialized yet)');
    }

    // Set up graceful shutdown handlers
    setupGracefulShutdown();

    logger.info('✅ [Worker Init] Worker initialization complete');
    console.log('[Worker Init] ✅ Worker initialization complete');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';

    console.error('[Worker Init] ❌ Failed to initialize worker:', errMsg);
    console.error('[Worker Init] Stack:', errStack);
    logger.error('[Worker Init] Failed to initialize worker:', errMsg);

    // Don't throw - let app continue, but log the error for debugging
  }
}

/**
 * Setup graceful shutdown handlers
 * Ensure worker processes are closed cleanly on app termination
 */
function setupGracefulShutdown() {
  const shutdownHandler = async (signal: string) => {
    logger.info(`📋 [Worker Init] Received ${signal}, initiating graceful shutdown...`);

    try {
      // Give currently processing jobs a grace period to complete
      const gracePeriod = 10000; // 10 seconds
      logger.info(`⏳ [Worker Init] Grace period: ${gracePeriod}ms for running jobs`);

      await new Promise((resolve) => setTimeout(resolve, gracePeriod));

      // Close services
      await closeGradingServices();

      logger.info(`✅ [Worker Init] Graceful shutdown complete, exiting...`);
      process.exit(0);
    } catch (error) {
      logger.error(`❌ [Worker Init] Error during graceful shutdown:`, error);
      process.exit(1);
    }
  };

  // Handle common termination signals
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('[Worker Init] Uncaught exception:', error);
    shutdownHandler('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[Worker Init] Unhandled rejection:', { reason, promise });
  });
}

/**
 * Safely close the worker during app shutdown
 * Can be called manually if needed
 */
export async function cleanupGradingWorker() {
  logger.info('🧹 [Worker Init] Cleaning up grading worker...');
  await closeGradingServices();
  logger.info('✅ [Worker Init] Cleanup complete');
}

export default initializeGradingWorker;
