import { db, FileParseStatus, type UploadedFile } from '@/types/database';
import { uploadToStorage, type StorageError, StorageErrorType, getStorageErrorMessage } from './storage.server';
import { triggerPdfParsing } from './pdf-parser.server';
import logger from '@/utils/logger';

export interface UploadFileRequest {
  userId: string;
  file: File;
  originalFileName?: string;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
}

export interface UploadFileResult {
  success: boolean;
  fileId?: string;
  error?: string;
  errorType?: 'storage' | 'database' | 'validation' | 'network' | 'auth' | 'quota';
  retryable?: boolean;
}

/**
 * Uploads a file and creates a database record with comprehensive error handling
 */
export async function uploadFile(request: UploadFileRequest): Promise<UploadFileResult> {
  const startTime = Date.now();

  try {
    const { userId, file, originalFileName, onProgress } = request;

    // Validate file
    if (!file || file.size === 0) {
      return {
        success: false,
        error: '無效的文件或文件為空',
        errorType: 'validation',
        retryable: false,
      };
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB limit
      return {
        success: false,
        error: '文件大小超過 100MB 限制',
        errorType: 'quota',
        retryable: false,
      };
    }

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedName = file.name
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // 只替換檔案系統不安全字符
      .replace(/\s+/g, '_') // 將空格替換為下劃線
      .replace(/\.{2,}/g, '.') // 防止多個連續的點
      .substring(0, 255); // 限制檔名長度

    const fileKey = `uploads/${userId}/${timestamp}-${sanitizedName}`;

    logger.info(`Starting file upload: ${file.name} (${file.size} bytes) for user ${userId}`);

    // Convert file to buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (error) {
      logger.error('Failed to read file data:', error);
      return {
        success: false,
        error: '無法讀取文件數據，請檢查文件是否損壞',
        errorType: 'validation',
        retryable: false,
      };
    }

    // Upload to storage with enhanced error handling
    let storageResult;
    try {
      storageResult = await uploadToStorage(buffer, fileKey, file.type, onProgress);
    } catch (error) {
      const storageError = error as StorageError;

      logger.error('Storage upload failed:', {
        error: storageError.message,
        type: storageError.type,
        retryable: storageError.retryable,
        fileName: file.name,
        fileSize: file.size,
        userId,
      });

      // Map storage error types to user-friendly messages
      let errorType: UploadFileResult['errorType'] = 'storage';
      const userMessage = getStorageErrorMessage(storageError);

      switch (storageError.type) {
        case StorageErrorType.AUTH:
          errorType = 'auth';
          break;
        case StorageErrorType.NETWORK:
          errorType = 'network';
          break;
        case StorageErrorType.QUOTA:
          errorType = 'quota';
          break;
        case StorageErrorType.VALIDATION:
          errorType = 'validation';
          break;
        default:
          errorType = 'storage';
      }

      return {
        success: false,
        error: userMessage,
        errorType,
        retryable: storageError.retryable,
      };
    }

    // Validate storage result
    if (!storageResult || !storageResult.key) {
      return {
        success: false,
        error: '存儲服務返回無效結果',
        errorType: 'storage',
        retryable: true,
      };
    }

    // Create database record
    let uploadedFile: UploadedFile;
    try {
      uploadedFile = await db.uploadedFile.create({
        data: {
          userId,
          fileName: sanitizedName,
          originalFileName: originalFileName || file.name,
          fileKey,
          fileSize: file.size,
          mimeType: file.type,
          parseStatus: FileParseStatus.PENDING,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      });
    } catch (error) {
      logger.error('Database record creation failed:', error);

      // Try to clean up the uploaded file from storage
      try {
        const { deleteFromStorage } = await import('./storage.server');
        await deleteFromStorage(fileKey);
        logger.info(`Cleaned up orphaned file from storage: ${fileKey}`);
      } catch (cleanupError) {
        logger.error(`Failed to cleanup orphaned file ${fileKey}:`, cleanupError);
      }

      return {
        success: false,
        error: '無法創建文件記錄，請稍後重試',
        errorType: 'database',
        retryable: true,
      };
    }

    // Trigger file parsing if it's a supported format
    if (
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'text/plain'
    ) {
      try {
        // Wait for parse to fully complete so the client gets a definitive result
        await triggerPdfParsing(uploadedFile.id, fileKey, originalFileName || file.name, userId);
      } catch (error) {
        // triggerPdfParsing already updated DB status to FAILED. Return failure to client.
        return {
          success: false,
          error: error instanceof Error ? error.message : '解析過程發生錯誤',
          errorType: 'network',
          retryable: true,
        };
      }
    } else {
      // Mark as completed for unsupported formats (we'll just use the file as-is)
      updateFileParseStatus(uploadedFile.id, FileParseStatus.COMPLETED, 'File uploaded successfully').catch((error) => {
        logger.error(`Failed to update parse status for ${uploadedFile.id}:`, error);
      });
    }

    const duration = Date.now() - startTime;
    logger.info(`File uploaded successfully: ${uploadedFile.id} (${file.size} bytes) in ${duration}ms`);

    return {
      success: true,
      fileId: uploadedFile.id,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Unexpected error during file upload:', {
      error: error instanceof Error ? error.message : error,
      userId: request.userId,
      fileName: request.file?.name,
      fileSize: request.file?.size,
      duration,
    });

    return {
      success: false,
      error: '文件上傳過程中發生未預期錯誤，請稍後重試',
      errorType: 'storage',
      retryable: true,
    };
  }
}

/**
 * Updates file parse status
 */
export async function updateFileParseStatus(
  fileId: string,
  status: FileParseStatus,
  parsedContent?: string,
  parseError?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.uploadedFile.update({
      where: { id: fileId },
      data: {
        parseStatus: status,
        parsedContent: parsedContent || undefined,
        parseError: parseError || undefined,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to update file parse status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update parse status',
    };
  }
}

/**
 * Gets files by user with optional filtering
 */
export async function getUserFiles(
  userId: string,
  options?: {
    parseStatus?: FileParseStatus | null;
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
  }
): Promise<{ files: UploadedFile[]; total: number; error?: string }> {
  try {
    const { parseStatus, limit = 50, offset = 0, includeDeleted = false } = options || {};

    const whereClause: any = {
      userId,
      ...(includeDeleted ? {} : { isDeleted: false }),
    };
    if (parseStatus !== undefined) {
      whereClause.parseStatus = parseStatus;
    }

    const [files, total] = await Promise.all([
      db.uploadedFile.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.uploadedFile.count({
        where: whereClause,
      }),
    ]);

    return { files, total };
  } catch (error) {
    logger.error('Failed to get user files:', error);
    return {
      files: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to get files',
    };
  }
}

/**
 * Gets a single file by ID
 */
export async function getFile(
  fileId: string,
  userId: string,
  includeDeleted: boolean = false
): Promise<{ file?: UploadedFile; error?: string }> {
  try {
    const file = await db.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
    });

    if (!file) {
      return { error: 'File not found' };
    }

    return { file };
  } catch (error) {
    logger.error('Failed to get file:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get file',
    };
  }
}

/**
 * Deletes a file (soft delete if used in grading, hard delete otherwise)
 */
export async function deleteFile(
  fileId: string,
  userId: string
): Promise<{ success: boolean; error?: string; deletionType?: 'soft' | 'hard' }> {
  try {
    // Get file record
    const file = await db.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
        isDeleted: false, // 只能刪除未刪除的檔案
      },
    });

    if (!file) {
      return { success: false, error: 'File not found or already deleted' };
    }

    // Check if file is being used in grading results
    const usedInGrading = await db.gradingResult.findFirst({
      where: { uploadedFileId: fileId },
    });

    if (usedInGrading) {
      // 軟刪除：已用於評分的檔案
      await db.uploadedFile.update({
        where: { id: fileId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      logger.info(`File soft deleted (used in grading): ${fileId}`);
      return { success: true, deletionType: 'soft' };
    } else {
      // 硬刪除：未用於評分的檔案
      await db.uploadedFile.delete({
        where: { id: fileId },
      });

      // TODO: 同時刪除儲存空間中的檔案
      logger.info(`File hard deleted (not used in grading): ${fileId}`);
      return { success: true, deletionType: 'hard' };
    }
  } catch (error) {
    logger.error('Failed to delete file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}

/**
 * Restores a soft-deleted file
 */
export async function restoreFile(fileId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get deleted file record
    const file = await db.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
        isDeleted: true,
      },
    });

    if (!file) {
      return { success: false, error: 'Deleted file not found' };
    }

    // 恢復檔案
    await db.uploadedFile.update({
      where: { id: fileId },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    logger.info(`File restored: ${fileId}`);

    return { success: true };
  } catch (error) {
    logger.error('Failed to restore file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore file',
    };
  }
}

/**
 * Gets files ready for grading (parsed successfully)
 */
export async function getReadyFiles(userId: string): Promise<{ files: UploadedFile[]; error?: string }> {
  try {
    const files = await db.uploadedFile.findMany({
      where: {
        userId,
        parseStatus: FileParseStatus.COMPLETED,
        isDeleted: false, // 過濾已刪除檔案
      },
      orderBy: { createdAt: 'desc' },
    });

    return { files };
  } catch (error) {
    logger.error('Failed to get ready files:', error);
    return {
      files: [],
      error: error instanceof Error ? error.message : 'Failed to get ready files',
    };
  }
}

/**
 * Cleans up expired files
 */
export async function cleanupExpiredFiles(): Promise<{ deletedCount: number; error?: string }> {
  try {
    const expiredFiles = await db.uploadedFile.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      select: { id: true, fileKey: true },
    });

    if (expiredFiles.length === 0) {
      return { deletedCount: 0 };
    }

    // Delete from database
    const deleteResult = await db.uploadedFile.deleteMany({
      where: {
        id: { in: expiredFiles.map((f) => f.id) },
      },
    });

    // TODO: Delete from storage
    // Note: Storage cleanup should be handled by a background job

    logger.info(`Cleaned up ${deleteResult.count} expired files`);

    return { deletedCount: deleteResult.count };
  } catch (error) {
    logger.error('Failed to cleanup expired files:', error);
    return {
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to cleanup files',
    };
  }
}
