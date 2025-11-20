import logger from '@/utils/logger';

/**
 * Initialize BullMQ Worker
 *
 * Triggers the initialization of the BullMQ grading worker by importing the service.
 * The actual worker instance is created in bullmq-grading.server.ts during module load.
 *
 * Called once during app startup (server-side only) by StartupService.
 * Graceful shutdown is handled centrally in StartupService.setupGracefulShutdown().
 *
 * @remarks
 * - This should NOT run in browser/SSR environments
 * - Worker continues running until process termination (SIGTERM/SIGINT)
 * - All shutdown logic is managed by StartupService
 */
export async function initializeGradingWorker(): Promise<void> {
  // Guard: Skip in browser environment
  if (typeof window !== 'undefined') {
    logger.warn('[Worker Init] Skipping initialization in browser environment');
    return;
  }

  try {
    logger.info('[Worker Init] Starting BullMQ grading worker...');

    // Dynamic import triggers worker instantiation in bullmq-grading.server.ts
    await import('./bullmq-grading.server.js');

    logger.info('[Worker Init] Worker initialization complete');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('[Worker Init] Failed to initialize worker:', errMsg);

    // Non-fatal: Allow app to continue even if worker fails to start
    // This enables the app to serve requests while worker issues are debugged
  }
}

export default initializeGradingWorker;
