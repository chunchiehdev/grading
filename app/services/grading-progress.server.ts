import { redis } from '@/lib/redis';
import { REDIS_KEYS } from '@/config/redis';

export type GradingProgress = {
  phase: 'check' | 'grade' | 'verify' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
  result?: any;
};

class GradingProgressStore {
  static getKey(gradingId: string): string {
    return `${REDIS_KEYS.GRADING_PROGRESS_PREFIX}${gradingId}`;
  }
  
  static async getProgress(gradingId: string): Promise<GradingProgress | null> {
    const redisKey = this.getKey(gradingId);
    console.log(`📝 Fetching progress from Redis key: ${redisKey}`);
    const data = await redis.get(redisKey);
    
    if (data) {
      console.log(`✅ Redis data found for ${gradingId}`, data.substring(0, 100) + '...');
      try {
        return JSON.parse(data);
      } catch (err) {
        console.error(`❌ Error parsing Redis data for ${gradingId}:`, err);
        return null;
      }
    } else {
      console.log(`❌ No data found in Redis for ${gradingId}`);
      return null;
    }
  }
  
  static async setProgress(gradingId: string, progress: GradingProgress): Promise<void> {
    const redisKey = this.getKey(gradingId);
    console.log(`📝 Setting progress to Redis key: ${redisKey}, phase: ${progress.phase}`);
    
    const serializedData = JSON.stringify(progress);
    await redis.set(
      redisKey, 
      serializedData, 
      'EX', 
      REDIS_KEYS.EXPIRATION_TIME
    );
    
    console.log(`✅ Progress saved to Redis for ${gradingId}`);
    
    // If complete or error, log the full data
    if (progress.phase === 'completed' || progress.phase === 'error') {
      console.log(`📊 Final progress state for ${gradingId}:`, progress);
    }
  }
}

export const GradingProgressService = {
  initialize: async (gradingId: string): Promise<void> => {
    console.log(`🔄 Initializing grading progress for ${gradingId}`);
    await GradingProgressStore.setProgress(gradingId, {
      phase: 'check',
      progress: 0,
      message: '開始評分...'
    });
  },
  
  updateProgress: async (
    gradingId: string, 
    progress: Partial<GradingProgress>
  ): Promise<void> => {
    console.log(`🔄 Updating progress for ${gradingId}:`, progress);
    const currentProgress = await GradingProgressStore.getProgress(gradingId);
    if (!currentProgress) {
      console.warn(`⚠️ No current progress found for ${gradingId}, initializing new progress`);
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
  
  getProgress: async (gradingId: string): Promise<GradingProgress | null> => {
    return GradingProgressStore.getProgress(gradingId);
  },
  
  complete: async (gradingId: string, result: any): Promise<void> => {
    console.log(`✅ Completing grading for ${gradingId}`);
    await GradingProgressStore.setProgress(gradingId, {
      phase: 'completed',
      progress: 100,
      message: '評分完成',
      result
    });
  },
  
  error: async (gradingId: string, error: string): Promise<void> => {
    console.error(`❌ Error in grading for ${gradingId}: ${error}`);
    await GradingProgressStore.setProgress(gradingId, {
      phase: 'error',
      progress: 0,
      message: '評分失敗',
      error
    });
  }
}; 