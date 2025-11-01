import { db } from '@/lib/db.server';
import { FileParseStatus } from '@/types/database';
import fetch from 'node-fetch';
import type { Response as FetchResponse } from 'node-fetch';
import FormData from 'form-data';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/services/storage.server';
import { storageConfig } from '@/config/storage';
import type { FetchOptions, PdfParserSubmitResponse, ParseResult } from '@/types/pdf-parser';
import https from 'https';
import logger from '@/utils/logger';

const PDF_PARSER_API_BASE = process.env.PDF_PARSER_API_URL || 'http://localhost:8000';
const PDF_PARSER_TIMEOUT_MS = Number(process.env.PDF_PARSER_TIMEOUT_MS || 5000);
const PDF_PARSER_RETRIES = Number(process.env.PDF_PARSER_RETRIES || 2);

// Docker + node-fetch + HTTPS has IPv6/IPv6 resolution issues for localhost
// Create agent only for localhost HTTPS URLs (not external APIs)
const createHttpsAgent = () => new https.Agent({
  rejectUnauthorized: true, // Keep SSL validation
  timeout: PDF_PARSER_TIMEOUT_MS,
  family: 4, // Force IPv4 to fix Docker networking
});

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
  timeoutMs = PDF_PARSER_TIMEOUT_MS
): Promise<FetchResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Only use HTTPS agent for localhost/Docker environments (not external APIs)
    // External APIs (like Cloudflare-hosted services) may not work with family: 4
    const isHttps = url.startsWith('https');
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('host.docker.internal');

    return await fetch(url, {
      ...options,
      signal: controller.signal,
      ...(isHttps && isLocalhost && { agent: createHttpsAgent() }),
    });
  } finally {
    clearTimeout(timeout);
  }
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
  let lastErr: Error | unknown;
  for (let attempt = 0; attempt <= PDF_PARSER_RETRIES; attempt++) {
    // Create fresh FormData for each retry to avoid listener accumulation
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/pdf',
    });
    formData.append('user_id', userId);
    formData.append('file_id', fileName);

    try {
      const targetUrl = `${PDF_PARSER_API_BASE}/parse`;
      logger.info(`\n🌐 REAL API CALL: Sending PDF to external parser`);
      logger.info(`   📍 URL: ${targetUrl}`);
      logger.info(`   📦 File: ${fileName} (${fileBuffer.length} bytes)`);
      logger.info(`   👤 User: ${userId}`);
      logger.info(`   🔄 Attempt: ${attempt + 1}/${PDF_PARSER_RETRIES + 1}`);

      const response = await fetchWithTimeout(targetUrl, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders() as Record<string, string>,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`   ❌ API Response: ${response.status} - ${errorText}`);
        throw new Error(`PDF Parser API error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as PdfParserSubmitResponse;
      logger.info(`   ✅ API Response: Task created with ID: ${result.task_id}`);
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
  throw lastErr instanceof Error ? lastErr : new Error('Failed to submit PDF for parsing');
}

async function getParsingResult(taskId: string): Promise<ParseResult> {
  let lastErr: Error | unknown;
  for (let attempt = 0; attempt <= PDF_PARSER_RETRIES; attempt++) {
    try {
      const pollUrl = `${PDF_PARSER_API_BASE}/task/${taskId}`;
      logger.debug(`🔍 Polling parser API: ${pollUrl}`);
      const response = await fetchWithTimeout(pollUrl);
      if (!response.ok) {
        logger.error(`   ❌ Poll failed: ${response.status}`);
        throw new Error(`Failed to check task status: ${response.status}`);
      }
      const result = (await response.json()) as ParseResult;
      logger.debug(`   📊 Task status: ${result.status}`);
      return result;
    } catch (err) {
      lastErr = err;
      // transient network error, small backoff and retry
      const backoff = 500 * (attempt + 1);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to reach PDF parser');
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
      logger.debug(`📋 Task ${taskId} status: ${result.status}, attempt ${attempt + 1}/${maxAttempts}`);
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
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
    logger.info(`🔄 Starting PDF parsing for file: ${fileName} (${fileId})`);

    await db.uploadedFile.update({
      where: { id: fileId },
      data: { parseStatus: FileParseStatus.PROCESSING },
    });

    const fileBuffer = await getFileFromStorage(fileKey);
    logger.info(`📥 Retrieved file from storage: ${fileName} (${fileBuffer.length} bytes)`);

    const taskId = await submitPdfForParsing(fileBuffer, fileName, userId);
    logger.info(`📤 PDF parsing task submitted: ${taskId} for file: ${fileName}`);

    // Await the long-running polling so we only return when complete
    const content = await pollForResult(taskId);

    logger.info(`✅ PDF parsing completed for ${fileName}: ${content.length} characters`);
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
    throw error instanceof Error ? error : new Error('Unknown error');
  }
}

export async function getUserUploadedFiles(userId: string, uploadId?: string) {
  const where = uploadId ? { userId, uploadId } : { userId };

  return db.uploadedFile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}
