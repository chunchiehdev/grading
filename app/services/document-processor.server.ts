import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/services/storage.server';
import { storageConfig } from '@/config/storage';
import { ProcessedDocument, UploadedFileInfo } from '@/types/files';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { createMCPGradingClient } from './mcp.server';

const DOCUMENT_ANALYSIS_document_API = `${process.env.API_URL}/analyze-document/`;
// const DOCUMENT_ANALYSIS_IMAGE_API = `${process.env.API_URL}/analyze-images/`;

/**
 * Feature flags for MCP integration
 */
const USE_MCP = process.env.USE_MCP === 'true';
const MCP_FALLBACK_TO_API = process.env.MCP_FALLBACK_TO_API !== 'false';

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
 * Processes a document using MCP server
 * @param {UploadedFileInfo} file - File information object
 * @returns {Promise<ProcessedDocument>} Processed document with extracted content
 */
async function processDocumentWithMCP(file: UploadedFileInfo): Promise<ProcessedDocument> {
  try {
    console.log(`使用 MCP 處理文件: ${file.name} (${file.type})`);
    
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

    const mcpClient = createMCPGradingClient();
    
    // Check MCP server health first
    const isHealthy = await mcpClient.healthCheck();
    if (!isHealthy && !MCP_FALLBACK_TO_API) {
      throw new Error('MCP 服務不可用且未啟用回退機制');
    }
    
    if (!isHealthy && MCP_FALLBACK_TO_API) {
      console.warn('MCP 服務不可用，回退到傳統 API');
      return await processDocumentWithAPI(file);
    }

    const mcpResponse = await mcpClient.analyzeDocument(
      file.name,
      file.type,
      fileData.buffer
    );

    if (!mcpResponse.success) {
      if (MCP_FALLBACK_TO_API) {
        console.warn('MCP 分析失敗，回退到傳統 API:', mcpResponse.error);
        return await processDocumentWithAPI(file);
      } else {
        throw new Error(mcpResponse.error || 'MCP 文件分析失敗');
      }
    }

    const content = mcpResponse.data?.text || mcpResponse.data?.content || '';
    
    return {
      fileName: file.name,
      fileKey: file.key,
      content,
      contentType: file.type,
      metadata: {
        processedBy: 'MCP',
        mcpResponse: mcpResponse.data,
      },
    };
  } catch (error) {
    console.error('MCP 文件處理錯誤:', error);
    
    if (MCP_FALLBACK_TO_API) {
      console.log('回退到傳統 API 處理');
      return await processDocumentWithAPI(file);
    }
    
    return {
      fileName: file.name,
      fileKey: file.key,
      content: '',
      contentType: file.type,
      error: error instanceof Error ? error.message : 'MCP 文件處理失敗',
    };
  }
}

/**
 * Processes a document using traditional API (legacy method)
 * @param {UploadedFileInfo} file - File information object
 * @returns {Promise<ProcessedDocument>} Processed document with extracted content
 */
async function processDocumentWithAPI(file: UploadedFileInfo): Promise<ProcessedDocument> {
  try {
    console.log(`使用傳統 API 處理文件: ${file.name} (${file.type})`);
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

    const buffer = fileData.buffer;

    if (!fileData.buffer.length) {
      throw new Error('無法讀取文件內容');
    }

    const formData = new FormData();

    formData.append('file', Buffer.from(buffer), {
      filename: file.name,
      contentType: file.type,
    });

    const response = await fetch(DOCUMENT_ANALYSIS_document_API, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.AUTH_KEY}`,
      },
      timeout: 120000,
    });

    if (!response.ok) {
      return {
        fileName: file.name,
        fileKey: file.key,
        content: '',
        contentType: file.type,
        error: `無法處理文件: ${file.name}`,
      };
    }

    const result = await response.json();

    console.log('result', result);

    const content = result.text || result.content || '';

    return {
      fileName: file.name,
      fileKey: file.key,
      content,
      contentType: file.type,
      metadata: {
        processedBy: 'API',
        apiResponse: result,
      },
    };
  } catch (error) {
    return {
      fileName: file.name,
      fileKey: file.key,
      content: '',
      contentType: file.type,
      error: error instanceof Error ? error.message : '文件處理失敗',
    };
  }
}

/**
 * Processes a single document by extracting text content
 * Automatically chooses between MCP and API based on configuration
 * @param {UploadedFileInfo} file - File information object with name, key, and type
 * @returns {Promise<ProcessedDocument>} Processed document with extracted content
 */
export async function processDocument(file: UploadedFileInfo): Promise<ProcessedDocument> {
  if (USE_MCP) {
    return await processDocumentWithMCP(file);
  } else {
    return await processDocumentWithAPI(file);
  }
}

/**
 * Processes multiple documents and collects results and errors
 * @param {UploadedFileInfo[]} files - Array of file information objects to process
 * @returns {Promise<Object>} Processing results containing documents and errors
 * @returns {ProcessedDocument[]} returns.documents - Array of processed documents
 * @returns {string[]} returns.errors - Array of error messages for failed files
 */
export async function processDocuments(files: UploadedFileInfo[]): Promise<{
  documents: ProcessedDocument[];
  errors: string[];
}> {
  const processedDocuments: ProcessedDocument[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const processedDoc = await processDocument(file);
      processedDocuments.push(processedDoc);

      if (processedDoc.error) {
        errors.push(`${file.name}: ${processedDoc.error}`);
      }
    } catch (error) {
      processedDocuments.push({
        fileName: file.name,
        fileKey: file.key,
        content: '',
        contentType: file.type,
        error: error instanceof Error ? error.message : '處理失敗',
      });
    }
  }

  return {
    documents: processedDocuments,
    errors,
  };
}
