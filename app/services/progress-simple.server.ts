import { db, GradingStatus, type GradingSessionStatus } from '@/types/database';
import logger from '@/utils/logger';

/**
 * File progress type - simple and direct
 */
export type FileProgress = {
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
};

/**
 * Simple progress service - PostgreSQL for persistence, memory for temporary
 * Follows Linus principle: solve real problems simply
 */
export const SimpleProgressService = {
  /**
   * Update progress for a grading result - store in database
   */
  updateGradingProgress: async (
    resultId: string,
    progress: number,
    status?: GradingStatus
  ): Promise<void> => {
    try {
      await db.gradingResult.update({
        where: { id: resultId },
        data: {
          progress: Math.max(0, Math.min(100, progress)),
          ...(status && { status }),
        },
      });

      logger.info(`📊 Progress updated for result ${resultId}: ${progress}%`);
    } catch (error) {
      logger.error(`❌ Failed to update progress for result ${resultId}:`, error);
    }
  },

  /**
   * Get progress for a grading session
   */
  getSessionProgress: async (
    sessionId: string
  ): Promise<{
    overall: number;
    results: Array<{
      id: string;
      status: GradingStatus;
      progress: number;
      uploadedFile: { originalFileName: string } | null;
    }>;
  }> => {
    try {
      const results = await db.gradingResult.findMany({
        where: { gradingSessionId: sessionId },
        select: {
          id: true,
          status: true,
          progress: true,
          uploadedFile: {
            select: {
              originalFileName: true,
            },
          },
        },
      });

      const totalProgress = results.reduce((sum, result) => sum + (result.progress || 0), 0);
      const overall = results.length > 0 ? Math.round(totalProgress / results.length) : 0;

      return { overall, results };
    } catch (error) {
      logger.error(`❌ Failed to get session progress for ${sessionId}:`, error);
      return { overall: 0, results: [] };
    }
  },

  /**
   * Update session-level progress
   */
  updateSessionProgress: async (sessionId: string): Promise<void> => {
    try {
      const results = await db.gradingResult.findMany({
        where: { gradingSessionId: sessionId },
        select: { status: true, progress: true },
      });

      if (results.length === 0) return;

      const totalProgress = results.reduce((sum, result) => sum + (result.progress || 0), 0);
      const overall = Math.round(totalProgress / results.length);

      const allCompleted = results.every((r) => r.status === GradingStatus.COMPLETED);
      const anyProcessing = results.some((r) => r.status === GradingStatus.PROCESSING);

      let sessionStatus: GradingSessionStatus;
      if (allCompleted) {
        sessionStatus = 'COMPLETED' as GradingSessionStatus;
      } else if (anyProcessing) {
        sessionStatus = 'PROCESSING' as GradingSessionStatus;
      } else {
        sessionStatus = 'PENDING' as GradingSessionStatus;
      }

      await db.gradingSession.update({
        where: { id: sessionId },
        data: {
          progress: overall,
          status: sessionStatus,
        },
      });

      logger.info(`🎯 Session ${sessionId} updated: ${overall}% ${sessionStatus}`);
    } catch (error) {
      logger.error(`❌ Failed to update session progress for ${sessionId}:`, error);
    }
  },

  /**
   * File upload progress - simple memory cache for short-term tracking
   * This is sufficient for upload progress which only lasts minutes
   */
  fileProgressCache: new Map<string, Record<string, FileProgress>>(),

  updateFileProgress: async (uploadId: string, filename: string, progress: FileProgress): Promise<void> => {
    if (progress.progress < 0 || progress.progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    if (!['uploading', 'success', 'error'].includes(progress.status)) {
      throw new Error('Invalid status');
    }

    const sessionData = SimpleProgressService.fileProgressCache.get(uploadId) || {};
    sessionData[filename] = progress;
    SimpleProgressService.fileProgressCache.set(uploadId, sessionData);

    // Simple cleanup - keep last 50 uploads in memory
    if (SimpleProgressService.fileProgressCache.size > 50) {
      const firstKey = SimpleProgressService.fileProgressCache.keys().next().value;
      if (firstKey) {
        SimpleProgressService.fileProgressCache.delete(firstKey);
      }
    }

    logger.info(`📤 File progress ${uploadId}/${filename}: ${progress.progress}% ${progress.status}`);
  },

  getFileProgress: async (uploadId: string): Promise<Record<string, FileProgress>> => {
    return SimpleProgressService.fileProgressCache.get(uploadId) || {};
  },

  clearFileProgress: async (uploadId: string): Promise<void> => {
    SimpleProgressService.fileProgressCache.delete(uploadId);
  },
};
