import { redis } from "@/lib/redis";
import { REDIS_KEYS } from "@/config/redis";
import type { UploadedFileInfo } from "@/types/files";

export interface ProgressData {
  phase: string;
  progress: number;
  message: string;
}

export interface UploadProgressData {
  fileName: string;
  fileSize: number;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
  updatedAt: number;
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
      console.error("Error setting progress:", error);
      throw new Error("Failed to store progress data");
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
      console.error("Error getting progress:", error);
      return null;
    }
  }

  static async delete(taskId: string): Promise<void> {
    const key = this.getKey(taskId);
    try {
      await redis.del(key);
    } catch (error) {
      console.error("Error deleting progress:", error);
      throw new Error("Failed to delete progress data");
    }
  }

  static async exists(taskId: string): Promise<boolean> {
    const key = this.getKey(taskId);
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error("Error checking progress existence:", error);
      return false;
    }
  }
}

type FileStatus = "uploading" | "success" | "error";

interface FileProgress {
  status: FileStatus;
  progress: number;
  error?: string;
}

/**
 * Service for tracking upload progress
 */
export class UploadProgressService {
  private static progressStore: Map<string, Map<string, FileProgress>> = new Map();
  
  /**
   * Initialize progress tracking for a new upload session
   */
  static async initialize(uploadId: string): Promise<void> {
    this.progressStore.set(uploadId, new Map());
  }
  
  /**
   * Update progress for a specific file
   */
  static async updateFileProgress(
    uploadId: string, 
    fileName: string, 
    progress: FileProgress
  ): Promise<void> {
    const uploadProgress = this.progressStore.get(uploadId);
    
    if (!uploadProgress) {
      throw new Error(`Upload ID ${uploadId} not found`);
    }
    
    uploadProgress.set(fileName, progress);
  }
  
  /**
   * Get progress for all files in an upload session
   */
  static async getProgress(uploadId: string): Promise<Record<string, FileProgress>> {
    const uploadProgress = this.progressStore.get(uploadId);
    
    if (!uploadProgress) {
      return {};
    }
    
    const result: Record<string, FileProgress> = {};
    
    for (const [fileName, progress] of uploadProgress.entries()) {
      result[fileName] = progress;
    }
    
    return result;
  }
  
  /**
   * Mark upload as complete with final file information
   */
  static async finalizeUpload(
    uploadId: string, 
    files: UploadedFileInfo[]
  ): Promise<void> {
    const uploadProgress = this.progressStore.get(uploadId);
    
    if (!uploadProgress) {
      return;
    }
    
    // Update all files to completed status
    for (const file of files) {
      uploadProgress.set(file.name, {
        status: "success",
        progress: 100
      });
    }
    
    // Keep progress data for a while before cleanup
    setTimeout(() => {
      this.progressStore.delete(uploadId);
    }, 1000 * 60 * 10); // 10 minutes
  }
  
  /**
   * Clear progress for a specific file
   */
  static async clearFileProgress(uploadId: string, fileName: string): Promise<void> {
    const uploadProgress = this.progressStore.get(uploadId);
    
    if (!uploadProgress) {
      return;
    }
    
    uploadProgress.delete(fileName);
  }
}
