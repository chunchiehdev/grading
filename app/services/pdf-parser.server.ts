import { db } from '@/lib/db.server';
import { FileParseStatus } from '@/types/database';
import fetch from 'node-fetch';
import type { Response as FetchResponse } from 'node-fetch';
import FormData from 'form-data';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/services/storage.server';
import { storageConfig } from '@/config/storage';

const PDF_PARSER_API_BASE = process.env.PDF_PARSER_API_URL || 'http://localhost:8000';
const PDF_PARSER_TIMEOUT_MS = Number(process.env.PDF_PARSER_TIMEOUT_MS || 5000);
const PDF_PARSER_RETRIES = Number(process.env.PDF_PARSER_RETRIES || 2);

async function fetchWithTimeout(
  url: string,
  options: any = {},
  timeoutMs = PDF_PARSER_TIMEOUT_MS
): Promise<FetchResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

interface ParseResult {
  status: string;
  content?: string;
  error?: string;
}

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

async function submitPdfForParsing(fileBuffer: Buffer, fileName: string, userId: string): Promise<string> {
  const formData = new FormData();

  formData.append('file', fileBuffer, {
    filename: fileName,
    contentType: 'application/pdf',
  });
  formData.append('user_id', userId);
  formData.append('file_id', fileName);

  let lastErr: any;
  for (let attempt = 0; attempt <= PDF_PARSER_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(`${PDF_PARSER_API_BASE}/parse`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`PDF Parser API error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as any;
      return result.task_id;
    } catch (err) {
      lastErr = err;
      const backoff = 500 * (attempt + 1);
      console.warn(`⚠️ PDF submit failed (attempt ${attempt + 1}/${PDF_PARSER_RETRIES + 1}):`, err);
      if (attempt < PDF_PARSER_RETRIES) {
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      break;
    }
  }
  throw lastErr ?? new Error('Failed to submit PDF for parsing');
}

async function getParsingResult(taskId: string): Promise<ParseResult> {
  let lastErr: any;
  for (let attempt = 0; attempt <= PDF_PARSER_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(`${PDF_PARSER_API_BASE}/task/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to check task status: ${response.status}`);
      }
      return (await response.json()) as ParseResult;
    } catch (err) {
      lastErr = err;
      // transient network error, small backoff and retry
      const backoff = 500 * (attempt + 1);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr ?? new Error('Failed to reach PDF parser');
}


async function pollForResult(taskId: string, maxAttempts: number = 60, intervalMs: number = 2000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let result: ParseResult | null = null;
    try {
      result = await getParsingResult(taskId);
    } catch (err) {
      // treat as transient and continue polling
      console.warn(`⚠️ PDF task ${taskId} status check failed (attempt ${attempt + 1}):`, err);
      result = null;
    }
    
    if (result && result.status === 'success') {
      return result.content!;
    } else if (result && result.status === 'failed') {
      throw new Error(`PDF parsing failed: ${result.error}`);
    }
    
    if (result) {
      console.log(`📋 Task ${taskId} status: ${result.status}, attempt ${attempt + 1}/${maxAttempts}`);
    }
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  throw new Error(`PDF parsing timed out after ${maxAttempts} attempts`);
}

export async function triggerPdfParsing(
  fileId: string,
  fileKey: string,
  fileName: string,
  userId: string
): Promise<void> {
  try {
    console.log(`🔄 Starting PDF parsing for file: ${fileName} (${fileId})`);

    await db.uploadedFile.update({
      where: { id: fileId },
      data: { parseStatus: FileParseStatus.PROCESSING },
    });

    const fileBuffer = await getFileFromStorage(fileKey);
    console.log(`📥 Retrieved file from storage: ${fileName} (${fileBuffer.length} bytes)`);

    const taskId = await submitPdfForParsing(fileBuffer, fileName, userId);
    console.log(`📤 PDF parsing task submitted: ${taskId} for file: ${fileName}`);

    // Await the long-running polling so we only return when complete
    const content = await pollForResult(taskId);

    console.log(`✅ PDF parsing completed for ${fileName}: ${content.length} characters`);
    const sanitizedContent = content.replace(/\0/g, '');

    await db.uploadedFile.update({
      where: { id: fileId },
      data: {
        parseStatus: FileParseStatus.COMPLETED,
        parsedContent: sanitizedContent,
      },
    });
  } catch (error) {
    console.error(`❌ PDF parsing failed for ${fileName}:`, error);

    await db.uploadedFile.update({
      where: { id: fileId },
      data: {
        parseStatus: FileParseStatus.FAILED,
        parseError: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    // Propagate to caller so API can return failure
    throw (error instanceof Error ? error : new Error('Unknown error'));
  }
}


export async function getUserUploadedFiles(userId: string, uploadId?: string) {
  const where: any = { userId };
  if (uploadId) {
    where.uploadId = uploadId;
  }

  return db.uploadedFile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
} 
