import { getUserId } from '@/services/auth.server';
import { uploadFile } from '@/services/uploaded-file.server';
import { UploadProgressService } from '@/services/progress.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

/**
 * API endpoint loader that rejects GET requests for file uploads
 */
export async function loader({ request }: { request: Request }) {
  return Response.json(
    createErrorResponse('only for post', ApiErrorCode.VALIDATION_ERROR, {
      message: 'use post request'
    }),
    { status: 405 }
  );
}

/**
 * API endpoint to handle file uploads with progress tracking and database storage
 */
export async function action({ request }: { request: Request }) {
  const startTime = Date.now();
  let uploadId: string | null = null;
  let userId: string | null = null;
  
  try {
    // Get user authentication
    userId = await getUserId(request);
    if (!userId) {
      logger.warn('Upload attempt without authentication', {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return Response.json(
        createErrorResponse('用戶未認證', ApiErrorCode.UNAUTHORIZED),
        { status: 401 }
      );
    }

    const formData = await request.formData();
    uploadId = formData.get('uploadId') as string;
    const files = formData.getAll('files') as File[];

    if (!uploadId) {
      logger.warn('Upload attempt without uploadId', { userId });
      return Response.json(
        createErrorResponse('Missing uploadId', ApiErrorCode.VALIDATION_ERROR),
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      logger.warn('Upload attempt without files', { userId, uploadId });
      return Response.json(
        createErrorResponse('No files provided', ApiErrorCode.VALIDATION_ERROR),
        { status: 400 }
      );
    }

    logger.info(`🚀 Processing ${files.length} files for user ${userId}, uploadId: ${uploadId}`, {
      userId,
      uploadId,
      fileCount: files.length,
      fileSizes: files.map(f => f.size),
      fileTypes: files.map(f => f.type),
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    });

    const fileResults = await Promise.all(
      files.map(async (file, index) => {
        const fileStartTime = Date.now();
        
        try {
          await UploadProgressService.updateFileProgress(uploadId!, file.name, {
            status: 'uploading',
            progress: 0,
          });

          logger.info(`📤 Starting upload for file ${index + 1}/${files.length}: ${file.name}`, {
            userId,
            uploadId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type
          });

          // Upload using the new service
          const result = await uploadFile({
            userId: userId!,
            file,
            originalFileName: file.name
          });

          if (!result.success) {
            throw new Error(result.error || 'Upload failed');
          }

          await UploadProgressService.updateFileProgress(uploadId!, file.name, {
            status: 'success',
            progress: 100,
          });

          const fileDuration = Date.now() - fileStartTime;
          logger.info(`✅ File uploaded successfully: ${file.name} -> ${result.fileId}`, {
            userId,
            uploadId,
            fileName: file.name,
            fileId: result.fileId,
            duration: fileDuration,
            fileSize: file.size
          });

          return {
            fileId: result.fileId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            success: true
          };
        } catch (error) {
          const fileDuration = Date.now() - fileStartTime;
          
          logger.error(`❌ Upload failed for ${file.name}:`, {
            error: error instanceof Error ? error.message : error,
            userId,
            uploadId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            duration: fileDuration,
            errorType: typeof error,
            stack: error instanceof Error ? error.stack : undefined
          });

          // Enhanced error handling with detailed progress update
          const errorMessage = error instanceof Error ? error.message : '上傳失敗';
          
          await UploadProgressService.updateFileProgress(uploadId!, file.name, {
            status: 'error',
            progress: 0,
            error: errorMessage,
          });

          return {
            fileName: file.name,
            success: false,
            error: errorMessage
          };
        }
      })
    );

    const successfulUploads = fileResults.filter(result => result.success);
    const failedUploads = fileResults.filter(result => !result.success);
    const totalDuration = Date.now() - startTime;

    // Log completion status with detailed metrics
    logger.info(`Upload completed for ${uploadId}: ${successfulUploads.length}/${files.length} successful`, {
      userId,
      uploadId,
      totalFiles: files.length,
      successfulFiles: successfulUploads.length,
      failedFiles: failedUploads.length,
      totalDuration,
      avgFileSize: files.reduce((sum, f) => sum + f.size, 0) / files.length,
      failedFileNames: failedUploads.map(f => f.fileName)
    });

    return Response.json(
      createSuccessResponse({
        uploadId,
        results: fileResults,
        summary: {
          total: files.length,
          successful: successfulUploads.length,
          failed: failedUploads.length,
        },
      })
    );
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    logger.error('Upload API error:', {
      error: error instanceof Error ? error.message : error,
      userId,
      uploadId,
      duration: totalDuration,
      errorType: typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: request.headers.get('user-agent')
    });
    
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : '上傳過程中發生錯誤',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}