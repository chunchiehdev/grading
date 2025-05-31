import { db, FileParseStatus, type UploadedFile } from '@/types/database';
import { uploadToStorage } from './storage.server';
import { triggerPdfParsing } from './pdf-parser.server';
import logger from '@/utils/logger';

export interface UploadFileRequest {
  userId: string;
  file: File;
  originalFileName?: string;
}

export interface UploadFileResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

/**
 * Uploads a file and creates a database record
 */
export async function uploadFile(request: UploadFileRequest): Promise<UploadFileResult> {
  try {
    const { userId, file, originalFileName } = request;
    
    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `uploads/${userId}/${timestamp}-${sanitizedName}`;
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to storage
    const storageResult = await uploadToStorage(buffer, fileKey, file.type);
    
    // Check if upload was successful (assuming success means we got a result)
    if (!storageResult || !storageResult.key) {
      return {
        success: false,
        error: 'Failed to upload file to storage'
      };
    }
    
    // Create database record
    const uploadedFile = await db.uploadedFile.create({
      data: {
        userId,
        fileName: sanitizedName,
        originalFileName: originalFileName || file.name,
        fileKey,
        fileSize: file.size,
        mimeType: file.type,
        parseStatus: FileParseStatus.PENDING,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });
    
    // Trigger file parsing if it's a supported format
    if (file.type === 'application/pdf' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'text/plain') {
      
      // Start parsing asynchronously
      triggerPdfParsing(uploadedFile.id, fileKey, sanitizedName, userId).catch(error => {
        logger.error(`Failed to parse file ${uploadedFile.id}:`, error);
      });
    } else {
      // Mark as completed for unsupported formats (we'll just use the file as-is)
      await updateFileParseStatus(uploadedFile.id, FileParseStatus.COMPLETED, 'File uploaded successfully');
    }
    
    logger.info(`File uploaded successfully: ${uploadedFile.id} (${file.size} bytes)`);
    
    return {
      success: true,
      fileId: uploadedFile.id
    };
  } catch (error) {
    logger.error('Failed to upload file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
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
        parseError: parseError || undefined
      }
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to update file parse status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update parse status'
    };
  }
}

/**
 * Gets files by user with optional filtering
 */
export async function getUserFiles(
  userId: string,
  options?: {
    parseStatus?: FileParseStatus;
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
  }
): Promise<{ files: UploadedFile[]; total: number; error?: string }> {
  try {
    const { parseStatus, limit = 50, offset = 0, includeDeleted = false } = options || {};
    
    const whereClause: any = { 
      userId,
      ...(includeDeleted ? {} : { isDeleted: false })
    };
    if (parseStatus) {
      whereClause.parseStatus = parseStatus;
    }
    
    const [files, total] = await Promise.all([
      db.uploadedFile.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.uploadedFile.count({
        where: whereClause
      })
    ]);
    
    return { files, total };
  } catch (error) {
    logger.error('Failed to get user files:', error);
    return {
      files: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to get files'
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
        ...(includeDeleted ? {} : { isDeleted: false })
      }
    });
    
    if (!file) {
      return { error: 'File not found' };
    }
    
    return { file };
  } catch (error) {
    logger.error('Failed to get file:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get file'
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
        isDeleted: false // 只能刪除未刪除的檔案
      }
    });
    
    if (!file) {
      return { success: false, error: 'File not found or already deleted' };
    }
    
    // Check if file is being used in grading results
    const usedInGrading = await db.gradingResult.findFirst({
      where: { uploadedFileId: fileId }
    });
    
    if (usedInGrading) {
      // 軟刪除：已用於評分的檔案
      await db.uploadedFile.update({
        where: { id: fileId },
        data: { 
          isDeleted: true,
          deletedAt: new Date()
        }
      });
      
      logger.info(`File soft deleted (used in grading): ${fileId}`);
      return { success: true, deletionType: 'soft' };
    } else {
      // 硬刪除：未用於評分的檔案
      await db.uploadedFile.delete({
        where: { id: fileId }
      });
      
      // TODO: 同時刪除儲存空間中的檔案
      logger.info(`File hard deleted (not used in grading): ${fileId}`);
      return { success: true, deletionType: 'hard' };
    }
  } catch (error) {
    logger.error('Failed to delete file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    };
  }
}

/**
 * Restores a soft-deleted file
 */
export async function restoreFile(
  fileId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get deleted file record
    const file = await db.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
        isDeleted: true
      }
    });
    
    if (!file) {
      return { success: false, error: 'Deleted file not found' };
    }
    
    // 恢復檔案
    await db.uploadedFile.update({
      where: { id: fileId },
      data: { 
        isDeleted: false,
        deletedAt: null
      }
    });
    
    logger.info(`File restored: ${fileId}`);
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to restore file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore file'
    };
  }
}

/**
 * Gets files ready for grading (parsed successfully)
 */
export async function getReadyFiles(
  userId: string
): Promise<{ files: UploadedFile[]; error?: string }> {
  try {
    const files = await db.uploadedFile.findMany({
      where: {
        userId,
        parseStatus: FileParseStatus.COMPLETED,
        isDeleted: false // 過濾已刪除檔案
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return { files };
  } catch (error) {
    logger.error('Failed to get ready files:', error);
    return {
      files: [],
      error: error instanceof Error ? error.message : 'Failed to get ready files'
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
          lt: new Date()
        }
      },
      select: { id: true, fileKey: true }
    });
    
    if (expiredFiles.length === 0) {
      return { deletedCount: 0 };
    }
    
    // Delete from database
    const deleteResult = await db.uploadedFile.deleteMany({
      where: {
        id: { in: expiredFiles.map(f => f.id) }
      }
    });
    
    // TODO: Delete from storage
    // Note: Storage cleanup should be handled by a background job
    
    logger.info(`Cleaned up ${deleteResult.count} expired files`);
    
    return { deletedCount: deleteResult.count };
  } catch (error) {
    logger.error('Failed to cleanup expired files:', error);
    return {
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to cleanup files'
    };
  }
}