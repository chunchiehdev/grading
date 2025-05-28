import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/services/storage.server';
import { storageConfig } from '@/config/storage';
import { ProcessedDocument, UploadedFileInfo } from '@/types/files';
import FormData from 'form-data';
import fetch from 'node-fetch';
import logger from '@/utils/logger';

const PDF_PARSER_API_BASE = process.env.PDF_PARSER_API_URL || 'http://localhost:8000';

interface ProcessingOptions {
  maxAttempts?: number;
  intervalMs?: number;
}

/**
 * Fetches a file from S3-compatible storage using file key
 * @param {string} fileKey - The storage key/path of the file to fetch
 * @returns {Promise<Object>} File data object with buffer, content type, and error info
 * @returns {Uint8Array} returns.buffer - File content as byte array
 * @returns {string} returns.contentType - MIME type of the file
 * @returns {string} [returns.error] - Error message if fetch failed
 * @returns {boolean} [returns.notFound] - True if file doesn't exist
 */
export async function fetchFileFromStorage(fileKey: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: storageConfig.bucket,
      Key: fileKey,
    });

    const response = await s3Client.send(command);
    const arrayBuffer = await response.Body?.transformToByteArray();

    if (!arrayBuffer) {
      throw new Error('無法讀取檔案');
    }

    return {
      buffer: arrayBuffer,
      contentType: response.ContentType || '',
    };
  } catch (error) {
    console.error(`獲取文件失敗: ${fileKey}`, error);
    return {
      error: error instanceof Error ? error.message : String(error),
      notFound: error instanceof Error && (error as any).Code === 'NoSuchKey',
      buffer: new Uint8Array(),
      contentType: '',
    };
  }
}

/**
 * Submit PDF to parser API and get task ID
 * @param {Buffer} fileBuffer - PDF file buffer
 * @param {string} fileName - Original file name
 * @param {string} userId - User ID for the request
 * @returns {Promise<string>} Task ID for tracking
 */
async function submitPdfForParsing(fileBuffer: Buffer, fileName: string, userId: string): Promise<string> {
  const formData = new FormData();
  
  formData.append('file', fileBuffer, {
    filename: fileName,
    contentType: 'application/pdf',
  });
  formData.append('user_id', userId);
  formData.append('file_id', fileName);

  const response = await fetch(`${PDF_PARSER_API_BASE}/parse`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`PDF Parser API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.task_id;
}

/**
 * Poll for parsing result until completion
 * @param {string} taskId - Task ID from submission
 * @param {number} maxAttempts - Maximum polling attempts
 * @param {number} intervalMs - Polling interval in milliseconds
 * @returns {Promise<string>} Parsed content
 */
async function pollForResult(taskId: string, maxAttempts: number = 60, intervalMs: number = 2000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${PDF_PARSER_API_BASE}/task/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status === 'success') {
      return result.content;
    } else if (result.status === 'failed') {
      throw new Error(`PDF parsing failed: ${result.error}`);
    }
    
    // Status is 'pending' or 'processing', continue polling
    logger.debug(`Task ${taskId} status: ${result.status}, attempt ${attempt + 1}/${maxAttempts}`);
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  throw new Error(`PDF parsing timed out after ${maxAttempts} attempts`);
}

/**
 * Processes a document using new PDF Parser API
 * @param {UploadedFileInfo} file - File information object
 * @param {string} userId - User ID for the API request
 * @param {ProcessingOptions} options - Optional processing configuration
 * @returns {Promise<ProcessedDocument>} Processed document with extracted content
 */
async function processDocumentWithAPI(
  file: UploadedFileInfo, 
  userId: string, 
  options: ProcessingOptions = {}
): Promise<ProcessedDocument> {
  try {
    logger.info(`使用新 PDF Parser API 處理文件: ${file.name}`, { 
      fileType: file.type,
      fileKey: file.key,
      userId 
    });
    
    const fileData = await fetchFileFromStorage(file.key);

    if (fileData.notFound) {
      return {
        fileName: file.name,
        fileKey: file.key,
        content: '',
        contentType: file.type,
        error: `檔案不存在: ${file.key}`,
      };
    }

    if (fileData.error) {
      throw new Error(fileData.error);
    }

    if (!fileData.buffer.length) {
      throw new Error('無法讀取文件內容');
    }

    // Submit PDF for parsing
    const taskId = await submitPdfForParsing(Buffer.from(fileData.buffer), file.name, userId);
    
    logger.info(`PDF 已提交解析，任務 ID: ${taskId}`, { fileName: file.name, userId });
    
    // Poll for result
    const content = await pollForResult(
      taskId, 
      options.maxAttempts || 60, 
      options.intervalMs || 2000
    );
    
    logger.debug('PDF 解析完成', { fileName: file.name, contentLength: content.length });

    return {
      fileName: file.name,
      fileKey: file.key,
      content,
      contentType: file.type,
      metadata: {
        processedBy: 'PDF_Parser_API',
        taskId,
        userId,
      },
    };
  } catch (error) {
    logger.error('PDF Parser API 處理錯誤', {
      fileName: file.name,
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return {
      fileName: file.name,
      fileKey: file.key,
      content: '',
      contentType: file.type,
      error: error instanceof Error ? error.message : 'PDF 解析失敗',
    };
  }
}

/**
 * Processes a single document by extracting text content
 * @param {UploadedFileInfo} file - File information object with name, key, and type
 * @param {string} userId - User ID for the API request
 * @param {ProcessingOptions} options - Optional processing configuration
 * @returns {Promise<ProcessedDocument>} Processed document with extracted content
 */
export async function processDocument(
  file: UploadedFileInfo, 
  userId: string, 
  options: ProcessingOptions = {}
): Promise<ProcessedDocument> {
  const startTime = Date.now();
  
  try {
    const result = await processDocumentWithAPI(file, userId, options);
    
    const processingTime = Date.now() - startTime;
    
    // Add processing time to metadata
    if (result.metadata) {
      result.metadata.totalProcessingTime = processingTime;
    } else {
      result.metadata = { totalProcessingTime: processingTime };
    }
    
    logger.info('文件處理完成', {
      fileName: file.name,
      userId,
      success: !result.error,
      processingTime,
      contentLength: result.content.length,
      processedBy: result.metadata?.processedBy
    });
    
    return result;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('文件處理失敗', {
      fileName: file.name,
      userId,
      error: error instanceof Error ? error.message : String(error),
      processingTime
    });
    
    return {
      fileName: file.name,
      fileKey: file.key,
      content: '',
      contentType: file.type,
      error: error instanceof Error ? error.message : '文件處理過程中發生錯誤',
      metadata: {
        totalProcessingTime: processingTime,
        processedBy: 'PDF_Parser_API'
      }
    };
  }
}
