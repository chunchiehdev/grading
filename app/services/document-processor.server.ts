import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/services/storage.server';
import { storageConfig } from '@/config/storage';
import { ProcessedDocument, UploadedFileInfo } from '@/types/files';
import FormData from 'form-data';
import fetch from 'node-fetch';

const DOCUMENT_ANALYSIS_document_API = `${process.env.API_URL}/analyze-document/`;
// const DOCUMENT_ANALYSIS_IMAGE_API = `${process.env.API_URL}/analyze-images/`;

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

export async function processDocument(file: UploadedFileInfo): Promise<ProcessedDocument> {
  try {
    console.log(`處理文件: ${file.name} (${file.type})`);
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
