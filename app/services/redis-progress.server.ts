import { redis } from '@/lib/redis';
import { REDIS_KEYS } from '@/config/redis';
import logger from '@/utils/logger';

/**
 * File progress type for Redis storage
 */
export type RedisFileProgress = {
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadedBytes?: number;
  totalBytes?: number;
  startTime?: number;
};

/**
 * Distributed Redis-based progress service - K8S Pod safe
 * Uses Redis Hash for efficient multi-file progress storage
 */
export class RedisProgressService {
  /**
   * Get Redis key for upload progress
   */
  private static getProgressKey(uploadId: string): string {
    return `${REDIS_KEYS.UPLOAD_PROGRESS_PREFIX}${uploadId}`;
  }

  /**
   * Update file progress in Redis - atomic operation
   */
  static async updateFileProgress(uploadId: string, filename: string, progress: RedisFileProgress): Promise<void> {
    try {
      const key = this.getProgressKey(uploadId);
      const progressData = {
        ...progress,
        updatedAt: Date.now(),
      };

      // Use Redis Hash for efficient storage of multiple files
      await redis.hset(key, filename, JSON.stringify(progressData));

      // Set TTL - 10 minutes for uploads
      await redis.expire(key, 600);

      logger.info(
        `📊 Redis progress updated: ${uploadId}/${filename}: ${progress.progress}% ` +
          `(${progress.uploadedBytes || 0}/${progress.totalBytes || 0} bytes)`
      );
    } catch (error) {
      logger.error({ err: error }, `❌ Failed to update Redis progress for ${uploadId}/${filename}:`);
      throw error;
    }
  }

  /**
   * Get all file progress for an upload session
   */
  static async getFileProgress(uploadId: string): Promise<Record<string, RedisFileProgress>> {
    try {
      const key = this.getProgressKey(uploadId);
      const data = await redis.hgetall(key);

      const progress: Record<string, RedisFileProgress> = {};

      for (const [filename, value] of Object.entries(data)) {
        try {
          progress[filename] = JSON.parse(value);
        } catch (parseError) {
          logger.warn({ err: parseError }, `Failed to parse progress data for ${filename}:`);
          // Return safe fallback data
          progress[filename] = {
            status: 'error',
            progress: 0,
            error: 'Data corruption',
          };
        }
      }

      return progress;
    } catch (error) {
      logger.error({ err: error }, `❌ Failed to get Redis progress for ${uploadId}:`);
      return {}; // Safe fallback
    }
  }

  /**
   * Initialize upload session with file metadata
   */
  static async initializeUpload(uploadId: string, files: Array<{ filename: string; size: number }>): Promise<void> {
    try {
      const key = this.getProgressKey(uploadId);

      // Initialize all files with 0% progress
      const pipeline = redis.pipeline();

      for (const file of files) {
        const initialProgress: RedisFileProgress = {
          status: 'uploading',
          progress: 0,
          uploadedBytes: 0,
          totalBytes: file.size,
          startTime: Date.now(),
        };

        pipeline.hset(key, file.filename, JSON.stringify(initialProgress));
      }

      // Set TTL
      pipeline.expire(key, 600);

      // Execute all commands atomically
      await pipeline.exec();

      logger.info(`🎯 Redis upload session initialized: ${uploadId} (${files.length} files)`);
    } catch (error) {
      logger.error({ err: error }, `❌ Failed to initialize Redis upload session ${uploadId}:`);
      throw error;
    }
  }

  /**
   * Update real-time bytes progress
   */
  static async updateBytesProgress(
    uploadId: string,
    filename: string,
    uploadedBytes: number,
    totalBytes: number
  ): Promise<void> {
    try {
      const progress = Math.round((uploadedBytes / totalBytes) * 100);

      await this.updateFileProgress(uploadId, filename, {
        status: 'uploading',
        progress,
        uploadedBytes,
        totalBytes,
        startTime: Date.now(), // For calculating speed
      });
    } catch (error) {
      logger.error({ err: error }, `❌ Failed to update bytes progress for ${uploadId}/${filename}:`);
    }
  }

  /**
   * Mark file as completed
   */
  static async completeFile(uploadId: string, filename: string, fileId?: string): Promise<void> {
    try {
      // Get current progress to preserve totalBytes
      const currentProgress = await this.getFileProgress(uploadId);
      const fileProgress = currentProgress[filename];

      await this.updateFileProgress(uploadId, filename, {
        status: 'success',
        progress: 100,
        uploadedBytes: fileProgress?.totalBytes || 0,
        totalBytes: fileProgress?.totalBytes || 0,
        ...(fileId && { fileId }),
      });
    } catch (error) {
      logger.error({ err: error }, `❌ Failed to complete file ${uploadId}/${filename}:`);
    }
  }

  /**
   * Mark file as failed
   */
  static async failFile(uploadId: string, filename: string, error: string): Promise<void> {
    try {
      const currentProgress = await this.getFileProgress(uploadId);
      const fileProgress = currentProgress[filename];

      await this.updateFileProgress(uploadId, filename, {
        status: 'error',
        progress: 0,
        uploadedBytes: 0,
        totalBytes: fileProgress?.totalBytes || 0,
        error,
      });
    } catch (err) {
      logger.error({ err: err }, `❌ Failed to mark file as failed ${uploadId}/${filename}:`);
    }
  }

  /**
   * Clean up upload session - call after completion
   */
  static async cleanupUpload(uploadId: string): Promise<void> {
    try {
      const key = this.getProgressKey(uploadId);
      await redis.del(key);
      logger.info(`🧹 Cleaned up Redis upload session: ${uploadId}`);
    } catch (error) {
      logger.warn({ err: error }, `⚠️ Failed to cleanup upload session ${uploadId}:`);
    }
  }

  /**
   * Get upload statistics for debugging
   */
  static async getUploadStats(uploadId: string): Promise<{
    totalFiles: number;
    completedFiles: number;
    failedFiles: number;
    totalBytes: number;
    uploadedBytes: number;
    overallProgress: number;
  }> {
    try {
      const progress = await this.getFileProgress(uploadId);
      const files = Object.values(progress);

      const totalFiles = files.length;
      const completedFiles = files.filter((f) => f.status === 'success').length;
      const failedFiles = files.filter((f) => f.status === 'error').length;
      const totalBytes = files.reduce((sum, f) => sum + (f.totalBytes || 0), 0);
      const uploadedBytes = files.reduce((sum, f) => sum + (f.uploadedBytes || 0), 0);
      const overallProgress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;

      return {
        totalFiles,
        completedFiles,
        failedFiles,
        totalBytes,
        uploadedBytes,
        overallProgress,
      };
    } catch (error) {
      logger.error({ err: error }, `❌ Failed to get upload stats for ${uploadId}:`);
      return {
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        totalBytes: 0,
        uploadedBytes: 0,
        overallProgress: 0,
      };
    }
  }
}

// Export singleton instance for convenience
export const redisProgressService = RedisProgressService;
