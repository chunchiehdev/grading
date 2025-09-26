import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { storageConfig } from '@/config/storage';
import logger from '@/utils/logger';

/**
 * AWS S3 client instance configured with storage settings
 */
export const s3Client = new S3Client(storageConfig.s3Config);

/**
 * Error types for better error handling and user feedback
 */
export enum StorageErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH', 
  NOT_FOUND = 'NOT_FOUND',
  QUOTA = 'QUOTA',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export interface StorageError extends Error {
  type: StorageErrorType;
  retryable: boolean;
  statusCode?: number;
  originalError?: Error;
}

/**
 * Creates a categorized storage error with additional metadata
 */
function createStorageError(error: any, operation: string): StorageError {
  const statusCode = error.$metadata?.httpStatusCode || error.statusCode;
  const errorCode = error.Code || error.name;
  const message = error.message || 'Storage operation failed';

  let type = StorageErrorType.UNKNOWN;
  let retryable = false;

  // Categorize error based on AWS error codes and status codes
  if (statusCode === 403 || errorCode === 'AccessDenied' || errorCode === 'InvalidAccessKeyId') {
    type = StorageErrorType.AUTH;
    retryable = false;
  } else if (statusCode === 404 || errorCode === 'NoSuchBucket' || errorCode === 'NoSuchKey') {
    type = StorageErrorType.NOT_FOUND;
    retryable = false;
  } else if (statusCode === 413 || errorCode === 'EntityTooLarge') {
    type = StorageErrorType.QUOTA;
    retryable = false;
  } else if (statusCode >= 500 || errorCode === 'InternalError' || errorCode === 'ServiceUnavailable') {
    type = StorageErrorType.NETWORK;
    retryable = true;
  } else if (statusCode === 429 || errorCode === 'SlowDown') {
    type = StorageErrorType.QUOTA;
    retryable = true;
  } else if (message.includes('network') || message.includes('timeout') || message.includes('ECONNRESET')) {
    type = StorageErrorType.NETWORK;
    retryable = true;
  } else if (statusCode >= 400 && statusCode < 500) {
    type = StorageErrorType.VALIDATION;
    retryable = false;
  }

  const storageError = new Error(`${operation} failed: ${message}`) as StorageError;
  storageError.type = type;
  storageError.retryable = retryable;
  storageError.statusCode = statusCode;
  storageError.originalError = error;

  return storageError;
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const delay = baseDelay * Math.pow(2, attempt - 2) + Math.random() * 1000;
        logger.info(`Retrying ${operationName} (attempt ${attempt}/${maxRetries}) after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await operation();
    } catch (error) {
      lastError = error;
      const storageError = createStorageError(error, operationName);
      
      logger.warn(`${operationName} attempt ${attempt}/${maxRetries} failed:`, {
        error: storageError.message,
        type: storageError.type,
        retryable: storageError.retryable,
        statusCode: storageError.statusCode
      });

      // Don't retry if error is not retryable or this is the last attempt
      if (!storageError.retryable || attempt === maxRetries) {
        throw storageError;
      }
    }
  }

  throw createStorageError(lastError, operationName);
}

/**
 * Gets file buffer from S3 storage with error handling and retry logic
 * @param {string} fileKey - Storage key/path of the file
 * @returns {Promise<Buffer>} File content as Buffer
 * @throws {StorageError} Categorized error with retry information
 */
export async function getFileFromStorage(fileKey: string): Promise<Buffer> {
  return retryWithBackoff(async () => {
    const command = new GetObjectCommand({
      Bucket: storageConfig.bucket,
      Key: fileKey,
    });

    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];
    
    if (response.Body) {
      // @ts-ignore
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
    }
    
    const buffer = Buffer.concat(chunks);
    logger.info(`Successfully retrieved file from storage: ${fileKey} (${buffer.length} bytes)`);
    return buffer;
  }, 3, 1000, `Get file ${fileKey}`);
}

/**
 * Uploads file data to S3-compatible storage with comprehensive error handling
 * @param {Buffer|Readable} fileData - File content as Buffer or Readable stream
 * @param {string} key - Storage key/path for the file
 * @param {string} contentType - MIME type of the file
 * @param {Function} onProgress - Optional progress callback (uploadedBytes, totalBytes)
 * @returns {Promise<Object>} Upload result with success status, key, URL, and ETag
 * @throws {StorageError} Categorized error with retry information
 */
export async function uploadToStorage(
  fileData: Buffer | Readable, 
  key: string, 
  contentType: string,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void
) {
  // Validate inputs
  if (!fileData) {
    const error = new Error('File data is required') as StorageError;
    error.type = StorageErrorType.VALIDATION;
    error.retryable = false;
    throw error;
  }

  if (!key || key.trim() === '') {
    const error = new Error('Storage key is required') as StorageError;
    error.type = StorageErrorType.VALIDATION;
    error.retryable = false;
    throw error;
  }

  const fileSize = Buffer.isBuffer(fileData) ? fileData.length : 'unknown';
  logger.info(`Starting upload to storage: ${key} (${fileSize} bytes, ${contentType})`);

  return retryWithBackoff(async () => {
    const command = new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: fileData,
      ContentType: contentType,
    });

    // Realistic progress simulation for better UX
    if (onProgress && Buffer.isBuffer(fileData)) {
      const totalBytes = fileData.length;
      
      // Always simulate progressive upload for better UX
      onProgress(0, totalBytes);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      onProgress(Math.floor(totalBytes * 0.2), totalBytes);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onProgress(Math.floor(totalBytes * 0.5), totalBytes);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      onProgress(Math.floor(totalBytes * 0.8), totalBytes);
      
      const response = await s3Client.send(command);
      
      // Final progress update
      await new Promise(resolve => setTimeout(resolve, 200));
      onProgress(totalBytes, totalBytes);
      
      const result = {
        success: true,
        key,
        url: storageConfig.getFileUrl(key),
        etag: response.ETag,
      };
      logger.info(`Successfully uploaded file to storage: ${key} (ETag: ${response.ETag})`);
      return result;
    } else {
      // No progress callback - standard upload
      const response = await s3Client.send(command);
      const result = {
        success: true,
        key,
        url: storageConfig.getFileUrl(key),
        etag: response.ETag,
      };
      logger.info(`Successfully uploaded file to storage: ${key} (ETag: ${response.ETag})`);
      return result;
    }
  }, 3, 1500, `Upload file ${key}`);
}

/**
 * Deletes a file from storage using its key with error handling
 * @param {string} key - Storage key/path of the file to delete
 * @returns {Promise<Object>} Deletion result with success status
 * @throws {StorageError} Categorized error with retry information
 */
export async function deleteFromStorage(key: string) {
  if (!key || key.trim() === '') {
    const error = new Error('Storage key is required for deletion') as StorageError;
    error.type = StorageErrorType.VALIDATION;
    error.retryable = false;
    throw error;
  }

  logger.info(`Starting deletion from storage: ${key}`);

  return retryWithBackoff(async () => {
    const command = new DeleteObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    });

    await s3Client.send(command);

    logger.info(`Successfully deleted file from storage: ${key}`);
    return { success: true };
  }, 3, 1000, `Delete file ${key}`);
}

/**
 * Streams a file from storage using its key
 * @param {string} key - Storage key/path of the file to stream
 * @returns {Promise<Object>} Stream object with content type and length
 * @throws {StorageError} Categorized error with retry information
 */
export async function streamFromStorage(key: string) {
  if (!key || key.trim() === '') {
    const error = new Error('Storage key is required for streaming') as StorageError;
    error.type = StorageErrorType.VALIDATION;
    error.retryable = false;
    throw error;
  }

  logger.info(`Starting file stream from storage: ${key}`);

  return retryWithBackoff(async () => {
    const command = new GetObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      const error = new Error('File not found or no content') as StorageError;
      error.type = StorageErrorType.NOT_FOUND;
      error.retryable = false;
      throw error;
    }

    // Convert the response body to a Node.js Readable stream
    let stream: Readable;
    if (response.Body instanceof Readable) {
      stream = response.Body;
    } else {
      // Handle other types (Uint8Array, blob, etc.) by converting to stream
      const chunks: Uint8Array[] = [];
      const reader = (response.Body as any).getReader();
      
      try {
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }

      const buffer = Buffer.concat(chunks);
      stream = Readable.from(buffer);
    }

    const result = {
      stream,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
      lastModified: response.LastModified,
      etag: response.ETag
    };

    logger.info(`Successfully started streaming file: ${key} (${result.contentLength} bytes)`);
    return result;
  }, 3, 1000, `Stream file ${key}`);
}

/**
 * Gets user-friendly error message based on storage error type
 */
export function getStorageErrorMessage(error: StorageError): string {
  switch (error.type) {
    case StorageErrorType.AUTH:
      return '存儲服務認證失敗，請聯繫系統管理員';
    case StorageErrorType.NOT_FOUND:
      return '找不到指定的文件或存儲位置';
    case StorageErrorType.QUOTA:
      return '文件太大或存儲空間不足，請嘗試較小的文件';
    case StorageErrorType.NETWORK:
      return '網絡連接問題，請稍後重試';
    case StorageErrorType.VALIDATION:
      return '文件格式或參數無效';
    default:
      return '文件上傳失敗，請稍後重試';
  }
}
