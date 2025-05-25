// src/services/progress.server.ts
import { redis } from '@/lib/redis';
import { REDIS_KEYS } from '@/config/redis';


/**
 * Type definition for file upload progress tracking
 * @typedef {Object} FileProgress
 * @property {'uploading'|'success'|'error'} status - Current upload status
 * @property {number} progress - Upload completion percentage (0-100)
 * @property {string} [error] - Error message if status is 'error'
 * @property {string} [key] - Storage key if upload successful
 */
export type FileProgress = {
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  key?: string;

};


/**
 * Internal class for Redis operations on upload progress data
 * @class ProgressStore
 */
class ProgressStore {
  /**
   * Generates Redis key for upload progress storage
   * @param {string} uploadId - Unique upload session identifier
   * @returns {string} Redis key for the upload progress
   */
  static getKey(uploadId: string): string {
    return `${REDIS_KEYS.UPLOAD_PROGRESS_PREFIX}${uploadId}`;
  }
  
  /**
   * Retrieves upload progress for all files in a session
   * @param {string} uploadId - Unique upload session identifier
   * @returns {Promise<Record<string, FileProgress>>} Map of filename to progress
   */
  static async getProgress(uploadId: string): Promise<Record<string, FileProgress>> {
    const data = await redis.get(this.getKey(uploadId));
    return data ? JSON.parse(data) : {};
  }
  
  /**
   * Stores upload progress data to Redis with expiration
   * @param {string} uploadId - Unique upload session identifier
   * @param {Record<string, FileProgress>} data - Progress data for all files
   * @returns {Promise<void>}
   */
  static async setProgress(uploadId: string, data: Record<string, FileProgress>): Promise<void> {
    await redis.set(
      this.getKey(uploadId), 
      JSON.stringify(data), 
      'EX', 
      REDIS_KEYS.EXPIRATION_TIME
    );
  }

}

/**
 * Service for managing file upload progress with Redis storage
 * Provides methods to track progress for multiple files in an upload session
 */
export const UploadProgressService = {
  /**
   * Initializes a new upload progress session
   * @param {string} uploadId - Unique upload session identifier
   * @returns {Promise<void>}
   */
  initialize: async (uploadId: string): Promise<void> => {
    await ProgressStore.setProgress(uploadId, {});
  },
  
  /**
   * Updates progress for a specific file in the upload session
   * @param {string} uploadId - Unique upload session identifier
   * @param {string} filename - Name of the file being uploaded
   * @param {FileProgress} progress - Progress data for the file
   * @returns {Promise<void>}
   * @throws {Error} If progress values are invalid
   */
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
  
  /**
   * Retrieves current upload progress for all files
   * @param {string} uploadId - Unique upload session identifier
   * @returns {Promise<Record<string, FileProgress>>} Map of filename to progress data
   */
  getProgress: async (uploadId: string): Promise<Record<string, FileProgress>> => {
    return ProgressStore.getProgress(uploadId);
  },
  
  /**
   * Removes progress tracking for a specific file
   * @param {string} uploadId - Unique upload session identifier
   * @param {string} filename - Name of the file to remove from tracking
   * @returns {Promise<void>}
   */
  clearFileProgress: async (uploadId: string, filename: string): Promise<void> => {
    const data = await ProgressStore.getProgress(uploadId);
    delete data[filename];
    await ProgressStore.setProgress(uploadId, data);
  },
  
  /**
   * Finalizes upload session by updating all files to success status
   * @param {string} uploadId - Unique upload session identifier
   * @param {any[]} uploadResults - Array of upload result objects with file metadata
   * @returns {Promise<void>}
   */
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