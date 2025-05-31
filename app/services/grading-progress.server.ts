import { redis } from '@/lib/redis';
import { REDIS_KEYS } from '@/config/redis';
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
 * Internal class for Redis operations on grading progress data
 * @class GradingProgressStore
 */
class GradingProgressStore {
  /**
   * Generates Redis key for grading progress storage
   * @param {string} gradingId - Unique grading session identifier
   * @returns {string} Redis key for the grading progress
   */
  static getKey(gradingId: string): string {
    return `${REDIS_KEYS.GRADING_PROGRESS_PREFIX}${gradingId}`;
  }
  
  /**
   * Retrieves grading progress from Redis
   * @param {string} gradingId - Unique grading session identifier
   * @returns {Promise<GradingProgress|null>} Progress data or null if not found
   */
  static async getProgress(gradingId: string): Promise<GradingProgress | null> {
    const redisKey = this.getKey(gradingId);
    logger.debug(`📝 Fetching progress from Redis key: ${redisKey}`);
    const data = await redis.get(redisKey);
    
    if (data) {
      logger.debug(`Redis data found for ${gradingId}`, data.substring(0, 100) + '...');
      try {
        return JSON.parse(data);
      } catch (err) {
        logger.error(`Error parsing Redis data for ${gradingId}:`, err);
        return null;
      }
    } else {
      logger.debug(`No data found in Redis for ${gradingId}`);
      return null;
    }
  }
  
  /**
   * Stores grading progress to Redis with expiration
   * @param {string} gradingId - Unique grading session identifier
   * @param {GradingProgress} progress - Progress data to store
   * @returns {Promise<void>}
   */
  static async setProgress(gradingId: string, progress: GradingProgress): Promise<void> {
    const redisKey = this.getKey(gradingId);
    logger.debug(`Setting progress to Redis key: ${redisKey}, phase: ${progress.phase}`);
    
    const serializedData = JSON.stringify(progress);
    await redis.set(
      redisKey, 
      serializedData, 
      'EX', 
      REDIS_KEYS.EXPIRATION_TIME
    );
    
    logger.debug(`Progress saved to Redis for ${gradingId}`);
    
    // If complete or error, log the full data
    if (progress.phase === 'completed' || progress.phase === 'error') {
      logger.info(`Final progress state for ${gradingId}:`, progress);
    }
  }
}

/**
 * Service for managing grading progress with Redis storage
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
      message: '開始評分...'
    });
  },
  
  /**
   * Updates existing grading progress with partial data
   * @param {string} gradingId - Unique grading session identifier
   * @param {Partial<GradingProgress>} progress - Progress updates to apply
   * @returns {Promise<void>}
   */
  updateProgress: async (
    gradingId: string, 
    progress: Partial<GradingProgress>
  ): Promise<void> => {
    logger.debug(`Updating progress for ${gradingId}:`, progress);
    const currentProgress = await GradingProgressStore.getProgress(gradingId);
    if (!currentProgress) {
      logger.warn(`⚠️ No current progress found for ${gradingId}, initializing new progress`);
      await GradingProgressStore.setProgress(gradingId, {
        phase: 'check',
        progress: 0,
        message: '開始評分...',
        ...progress
      });
      return;
    }

    const updatedProgress = {
      ...currentProgress,
      ...progress
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
      result
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
      error
    });
  }
}; 