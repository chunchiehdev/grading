import { db } from '@/types/database';
import logger from '@/utils/logger';

/**
 * Type definition for grading progress tracking
 * @typedef {Object} GradingProgress
 * @property {'check'|'grade'|'verify'|'completed'|'error'} phase - Current grading phase
 * @property {number} progress - Completion percentage (0-100)
 * @property {string} message - Human-readable status message
 * @property {string} [error] - Error message if phase is 'error'
 * @property {any} [result] - Final grading result if phase is 'completed'
 */
export type GradingProgress = {
  phase: 'check' | 'grade' | 'verify' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
  result?: any;
};

/**
 * Internal class for database operations on grading progress data
 * @class GradingProgressStore
 */
class GradingProgressStore {
  /**
   * Retrieves grading progress from database
   * @param {string} gradingId - Unique grading session identifier
   * @returns {Promise<GradingProgress|null>} Progress data or null if not found
   */
  static async getProgress(gradingId: string): Promise<GradingProgress | null> {
    try {
      logger.debug(`📝 Fetching progress from database for: ${gradingId}`);

      // Try to find existing grading result
      const result = await db.gradingResult.findUnique({
        where: { id: gradingId },
        select: {
          status: true,
          progress: true,
          result: true,
          errorMessage: true,
        },
      });

      if (!result) {
        logger.debug(`No data found in database for ${gradingId}`);
        return null;
      }

      // Convert database status to progress format
      let phase: GradingProgress['phase'];
      let message: string;

      switch (result.status) {
        case 'PENDING':
          phase = 'check';
          message = '等待評分中...';
          break;
        case 'PROCESSING':
          phase = 'grade';
          message = '評分進行中...';
          break;
        case 'COMPLETED':
          phase = 'completed';
          message = '評分完成';
          break;
        case 'FAILED':
          phase = 'error';
          message = '評分失敗';
          break;
        default:
          phase = 'check';
          message = '準備中...';
      }

      const progressData: GradingProgress = {
        phase,
        progress: result.progress,
        message,
        error: result.errorMessage || undefined,
        result: result.status === 'COMPLETED' ? result.result : undefined,
      };

      logger.debug(`Found progress for ${gradingId}:`, progressData);
      return progressData;
    } catch (error) {
      logger.error(`Error fetching progress for ${gradingId}:`, error);
      return null;
    }
  }

  /**
   * Stores grading progress to database
   * @param {string} gradingId - Unique grading session identifier
   * @param {GradingProgress} progress - Progress data to store
   * @returns {Promise<void>}
   */
  static async setProgress(gradingId: string, progress: GradingProgress): Promise<void> {
    try {
      logger.debug(`Setting progress for ${gradingId}, phase: ${progress.phase}`);

      // Convert progress format to database fields
      let status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
      switch (progress.phase) {
        case 'check':
          status = 'PENDING';
          break;
        case 'grade':
        case 'verify':
          status = 'PROCESSING';
          break;
        case 'completed':
          status = 'COMPLETED';
          break;
        case 'error':
          status = 'FAILED';
          break;
        default:
          status = 'PENDING';
      }

      await db.gradingResult.update({
        where: { id: gradingId },
        data: {
          status,
          progress: progress.progress,
          errorMessage: progress.error,
        },
      });

      logger.debug(`Progress saved to database for ${gradingId}`);

      // Log completion
      if (progress.phase === 'completed' || progress.phase === 'error') {
        logger.info(`Final progress state for ${gradingId}:`, progress);
      }
    } catch (error) {
      logger.error(`Error saving progress for ${gradingId}:`, error);
    }
  }
}

/**
 * Service for managing grading progress with database storage
 * Provides methods to initialize, update, and track grading operations
 */
export const GradingProgressService = {
  /**
   * Initializes a new grading progress session
   * @param {string} gradingId - Unique grading session identifier
   * @returns {Promise<void>}
   */
  initialize: async (gradingId: string): Promise<void> => {
    logger.debug(`Initializing grading progress for ${gradingId}`);
    await GradingProgressStore.setProgress(gradingId, {
      phase: 'check',
      progress: 0,
      message: '開始評分...',
    });
  },

  /**
   * Updates existing grading progress with partial data
   * @param {string} gradingId - Unique grading session identifier
   * @param {Partial<GradingProgress>} progress - Progress updates to apply
   * @returns {Promise<void>}
   */
  updateProgress: async (gradingId: string, progress: Partial<GradingProgress>): Promise<void> => {
    logger.debug(`Updating progress for ${gradingId}:`, progress);
    const currentProgress = await GradingProgressStore.getProgress(gradingId);

    if (!currentProgress) {
      logger.warn(`⚠️ No current progress found for ${gradingId}, initializing new progress`);
      await GradingProgressStore.setProgress(gradingId, {
        phase: 'check',
        progress: 0,
        message: '開始評分...',
        ...progress,
      });
      return;
    }

    const updatedProgress = {
      ...currentProgress,
      ...progress,
    };

    await GradingProgressStore.setProgress(gradingId, updatedProgress);
  },

  /**
   * Retrieves current grading progress
   * @param {string} gradingId - Unique grading session identifier
   * @returns {Promise<GradingProgress|null>} Current progress or null if not found
   */
  getProgress: async (gradingId: string): Promise<GradingProgress | null> => {
    return GradingProgressStore.getProgress(gradingId);
  },

  /**
   * Marks grading as completed with final results
   * @param {string} gradingId - Unique grading session identifier
   * @param {any} result - Final grading results
   * @returns {Promise<void>}
   */
  complete: async (gradingId: string, result: any): Promise<void> => {
    logger.info(`Completing grading for ${gradingId}`);
    await GradingProgressStore.setProgress(gradingId, {
      phase: 'completed',
      progress: 100,
      message: '評分完成',
      result,
    });
  },

  /**
   * Marks grading as failed with error information
   * @param {string} gradingId - Unique grading session identifier
   * @param {string} error - Error message describing the failure
   * @returns {Promise<void>}
   */
  error: async (gradingId: string, error: string): Promise<void> => {
    logger.error(`Error in grading for ${gradingId}: ${error}`);
    await GradingProgressStore.setProgress(gradingId, {
      phase: 'error',
      progress: 0,
      message: '評分失敗',
      error,
    });
  },
};
