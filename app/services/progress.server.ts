// src/services/progress.server.ts
import { redis } from '@/lib/redis';
import { REDIS_KEYS } from '@/config/redis';

export type FileProgress = {
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  key?: string;
};

// Helper for Redis operations with JSON
class ProgressStore {
  static getKey(uploadId: string): string {
    return `${REDIS_KEYS.UPLOAD_PROGRESS_PREFIX}${uploadId}`;
  }
  
  static async getProgress(uploadId: string): Promise<Record<string, FileProgress>> {
    const data = await redis.get(this.getKey(uploadId));
    return data ? JSON.parse(data) : {};
  }
  
  static async setProgress(uploadId: string, data: Record<string, FileProgress>): Promise<void> {
    await redis.set(
      this.getKey(uploadId), 
      JSON.stringify(data), 
      'EX', 
      REDIS_KEYS.EXPIRATION_TIME
    );
  }
}

export const UploadProgressService = {
  initialize: async (uploadId: string): Promise<void> => {
    await ProgressStore.setProgress(uploadId, {});
  },
  
  updateFileProgress: async (uploadId: string, filename: string, progress: FileProgress): Promise<void> => {
    // Basic validation without zod
    if (progress.progress < 0 || progress.progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    if (!['uploading', 'success', 'error'].includes(progress.status)) {
      throw new Error('Invalid status');
    }
    
    const data = await ProgressStore.getProgress(uploadId);
    data[filename] = progress;
    await ProgressStore.setProgress(uploadId, data);
  },
  
  getProgress: async (uploadId: string): Promise<Record<string, FileProgress>> => {
    return ProgressStore.getProgress(uploadId);
  },
  
  clearFileProgress: async (uploadId: string, filename: string): Promise<void> => {
    const data = await ProgressStore.getProgress(uploadId);
    delete data[filename];
    await ProgressStore.setProgress(uploadId, data);
  },
  
  finalizeUpload: async (uploadId: string, uploadResults: any[]): Promise<void> => {
    const data = await ProgressStore.getProgress(uploadId);
    
    uploadResults.forEach(file => {
      data[file.name] = {
        status: 'success',
        progress: 100,
        key: file.key
      };
    });
    
    await ProgressStore.setProgress(uploadId, data);
  }
};