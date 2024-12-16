import { redis } from '~/lib/redis';
import { REDIS_KEYS } from '~/config/redis';

export interface ProgressData {
  phase: string;
  progress: number;
  message: string;
}

export class ProgressService {
  private static getKey(taskId: string): string {
    return REDIS_KEYS.PROGRESS_PREFIX + taskId;
  }

  static async set(taskId: string, data: ProgressData): Promise<void> {
    const key = this.getKey(taskId);
    try {
      await redis.hset(key, {
        phase: data.phase,
        progress: data.progress.toString(),
        message: data.message,
        updatedAt: Date.now().toString(),
      });
      await redis.expire(key, REDIS_KEYS.EXPIRATION_TIME);
    } catch (error) {
      console.error('Error setting progress:', error);
      throw new Error('Failed to store progress data');
    }
  }

  static async get(taskId: string): Promise<ProgressData | null> {
    const key = this.getKey(taskId);
    try {
      const data = await redis.hgetall(key);
      if (Object.keys(data).length === 0) return null;
      
      return {
        phase: data.phase,
        progress: parseInt(data.progress),
        message: data.message,
      };
    } catch (error) {
      console.error('Error getting progress:', error);
      return null;
    }
  }

  static async delete(taskId: string): Promise<void> {
    const key = this.getKey(taskId);
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Error deleting progress:', error);
      throw new Error('Failed to delete progress data');
    }
  }

  static async exists(taskId: string): Promise<boolean> {
    const key = this.getKey(taskId);
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking progress existence:', error);
      return false;
    }
  }

}