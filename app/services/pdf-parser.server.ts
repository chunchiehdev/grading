import { db } from '@/lib/db.server';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/services/storage.server';
import { storageConfig } from '@/config/storage';

const PDF_PARSER_API_BASE = process.env.PDF_PARSER_API_URL || 'http://localhost:8000';

/**
 * 從 Minio 獲取文件數據
 */
async function getFileFromStorage(fileKey: string): Promise<Buffer> {
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
  
  return Buffer.concat(chunks);
}

/**
 * 提交 PDF 到解析 API
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
 * 查詢解析結果
 */
async function getParsingResult(taskId: string): Promise<{ status: string; content?: string; error?: string }> {
  const response = await fetch(`${PDF_PARSER_API_BASE}/task/${taskId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to check task status: ${response.status}`);
  }

  return response.json();
}

/**
 * 輪詢解析結果直到完成
 */
async function pollForResult(taskId: string, maxAttempts: number = 60, intervalMs: number = 2000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getParsingResult(taskId);
    
    if (result.status === 'success') {
      return result.content!;
    } else if (result.status === 'failed') {
      throw new Error(`PDF parsing failed: ${result.error}`);
    }
    
    // Status is 'pending' or 'processing', continue polling
    console.log(`📋 Task ${taskId} status: ${result.status}, attempt ${attempt + 1}/${maxAttempts}`);
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  throw new Error(`PDF parsing timed out after ${maxAttempts} attempts`);
}

/**
 * 觸發 PDF 解析 (異步)
 */
export async function triggerPdfParsing(fileId: string, fileKey: string, fileName: string, userId: string): Promise<void> {
  try {
    console.log(`🔄 Starting PDF parsing for file: ${fileName} (${fileId})`);
    
    // 更新狀態為 processing
    await db.uploadedFile.update({
      where: { id: fileId },
      data: { parseStatus: 'processing' },
    });

    // 從 Minio 獲取文件
    const fileBuffer = await getFileFromStorage(fileKey);
    console.log(`📥 Retrieved file from storage: ${fileName} (${fileBuffer.length} bytes)`);

    // 提交到 PDF Parser API
    const taskId = await submitPdfForParsing(fileBuffer, fileName, userId);
    console.log(`📤 PDF parsing task submitted: ${taskId} for file: ${fileName}`);

    // 更新 taskId
    await db.uploadedFile.update({
      where: { id: fileId },
      data: { parseTaskId: taskId },
    });

    // 開始輪詢結果 (在背景執行)
    pollForResult(taskId)
      .then(async (content) => {
        console.log(`✅ PDF parsing completed for ${fileName}: ${content.length} characters`);
        
        await db.uploadedFile.update({
          where: { id: fileId },
          data: {
            parseStatus: 'success',
            parsedContent: content,
          },
        });
      })
      .catch(async (error) => {
        console.error(`❌ PDF parsing failed for ${fileName}:`, error);
        
        await db.uploadedFile.update({
          where: { id: fileId },
          data: {
            parseStatus: 'failed',
            parseError: error.message,
          },
        });
      });

  } catch (error) {
    console.error(`❌ Failed to trigger PDF parsing for ${fileName}:`, error);
    
    await db.uploadedFile.update({
      where: { id: fileId },
      data: {
        parseStatus: 'failed',
        parseError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * 獲取用戶的所有上傳檔案
 */
export async function getUserUploadedFiles(userId: string, uploadId?: string) {
  const where: any = { userId };
  if (uploadId) {
    where.uploadId = uploadId;
  }

  return db.uploadedFile.findMany({
    where,
    include: {
      selectedRubric: {
        include: {
          criteria: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
} 