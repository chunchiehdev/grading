import { gradeAssignment } from '@/services/aiProcessor.server';
import { validateAssignmentWithZod } from '@/schemas/assignment';
import type { AssignmentSubmission, FeedbackData } from '@/types/grading';
import { ProgressService } from '@/services/progress.server';
import crypto from 'crypto';

/**
 * 批量評分請求
 */
export interface BatchGradingRequest {
  assignments: AssignmentSubmission[];
  options?: {
    callback_url?: string;
    webhook_secret?: string;
    batch_id?: string;
  };
}

/**
 * 批量評分回應
 */
export interface BatchGradingResponse {
  batch_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  results?: { [key: string]: FeedbackData | { error: string } };
  errors?: string[];
}

/**
 * LTI 整合資訊
 */
export interface LtiContext {
  consumer_key: string;
  context_id: string;
  user_id: string;
  roles: string[];
  custom_params: Record<string, string>;
}

// 儲存批量評分資料的緩存
const batchGradingCache = new Map<string, BatchGradingResponse>();

// 臨時的 LTI 上下文緩存 (實際項目中應該使用 Redis)
export const LTI_CONTEXT_CACHE = new Map<string, { context: any; createdAt: number }>();

/**
 * 處理單一作業的評分請求
 * 用於 REST API 整合
 */
export async function handleGradingRequest(
  submission: AssignmentSubmission,
  requestId: string = crypto.randomUUID()
): Promise<{ feedback?: FeedbackData; error?: string; requestId: string }> {
  try {
    // 驗證提交內容
    const validationResult = validateAssignmentWithZod(submission);

    if (!validationResult.isValid) {
      return {
        error: `驗證失敗: ${validationResult.errors?.join(', ') || '未知錯誤'}`,
        requestId,
      };
    }

    // 使用驗證後的資料
    const validatedSubmission = validationResult.data as AssignmentSubmission;

    // 執行評分
    const feedback = await gradeAssignment(validatedSubmission, async (phase, progress, message) => {
      await ProgressService.set(requestId, { phase, progress, message });
    });

    return { feedback, requestId };
  } catch (error) {
    console.error('API grading error:', error);
    return {
      error: error instanceof Error ? error.message : '評分過程中發生未知錯誤',
      requestId,
    };
  }
}

/**
 * 處理批量評分請求
 * 非同步處理多個作業並返回批次ID
 */
export async function handleBatchGradingRequest(
  request: BatchGradingRequest
): Promise<{ batch_id: string; error?: string }> {
  const { assignments, options } = request;
  const batchId = options?.batch_id || crypto.randomUUID();

  if (!assignments || assignments.length === 0) {
    return { batch_id: batchId, error: '未提供作業內容' };
  }

  // 初始化批次狀態
  const batchStatus: BatchGradingResponse = {
    batch_id: batchId,
    status: 'pending',
    total: assignments.length,
    processed: 0,
    results: {},
  };

  batchGradingCache.set(batchId, batchStatus);

  // 非同步處理批次
  processBatchAsync(batchId, assignments, options);

  return { batch_id: batchId };
}

/**
 * 非同步處理批量評分
 */
async function processBatchAsync(
  batchId: string,
  assignments: AssignmentSubmission[],
  options?: BatchGradingRequest['options']
) {
  try {
    const batchStatus = batchGradingCache.get(batchId);
    if (!batchStatus) return;

    batchStatus.status = 'processing';

    for (const submission of assignments) {
      try {
        // 為每個作業生成唯一ID
        const requestId = crypto.randomUUID();

        // 評分
        const result = await handleGradingRequest(submission, requestId);

        // 更新結果
        if (batchStatus.results) {
          if (result.feedback) {
            batchStatus.results[requestId] = result.feedback;
          } else if (result.error) {
            batchStatus.results[requestId] = { error: result.error };
          }
        }
      } catch (error) {
        console.error(`Error processing submission in batch ${batchId}:`, error);
        if (!batchStatus.errors) batchStatus.errors = [];
        batchStatus.errors.push(error instanceof Error ? error.message : '未知錯誤');
      } finally {
        // 更新進度
        batchStatus.processed++;
        batchGradingCache.set(batchId, batchStatus);
      }
    }

    // 完成批次處理
    batchStatus.status = 'completed';
    batchGradingCache.set(batchId, batchStatus);

    // 如果提供了回調 URL，發送結果通知
    if (options?.callback_url) {
      await sendCallbackNotification(batchStatus, options);
    }
  } catch (error) {
    console.error(`Batch processing error for ${batchId}:`, error);
    const batchStatus = batchGradingCache.get(batchId);
    if (batchStatus) {
      batchStatus.status = 'failed';
      if (!batchStatus.errors) batchStatus.errors = [];
      batchStatus.errors.push(error instanceof Error ? error.message : '批次處理發生未知錯誤');
      batchGradingCache.set(batchId, batchStatus);
    }
  }
}

/**
 * 發送回調通知
 */
async function sendCallbackNotification(
  batchStatus: BatchGradingResponse,
  options: NonNullable<BatchGradingRequest['options']>
) {
  try {
    const { callback_url, webhook_secret } = options;
    if (!callback_url) return;

    // 準備簽名
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (webhook_secret) {
      const payload = JSON.stringify(batchStatus);
      const signature = crypto.createHmac('sha256', webhook_secret).update(payload).digest('hex');

      headers['X-Webhook-Signature'] = signature;
    }

    // 發送回調
    await fetch(callback_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(batchStatus),
    });
  } catch (error) {
    console.error('Callback notification error:', error);
  }
}

/**
 * 獲取批次評分狀態
 */
export function getBatchGradingStatus(batchId: string): BatchGradingResponse | null {
  return batchGradingCache.get(batchId) || null;
}

/**
 * 驗證 LTI 請求
 */
export function validateLtiRequest(
  params: Record<string, string>,
  consumerSecret: string
): { isValid: boolean; context: LtiContext | null } {
  try {
    // 基本 LTI 驗證邏輯
    const {
      oauth_consumer_key,
      oauth_signature,
      oauth_signature_method,
      oauth_timestamp,
      oauth_nonce,
      context_id,
      user_id,
      roles,
      ...otherParams
    } = params;

    // 簡化版本 - 在實際環境中應該實現完整的 OAuth 驗證
    if (!oauth_consumer_key || !context_id || !user_id) {
      return { isValid: false, context: null };
    }

    // 提取自定義參數
    const customParams: Record<string, string> = {};
    Object.entries(otherParams).forEach(([key, value]) => {
      if (key.startsWith('custom_')) {
        customParams[key.replace('custom_', '')] = value;
      }
    });

    // LTI 整合資訊
    const ltiContext: LtiContext = {
      consumer_key: oauth_consumer_key,
      context_id,
      user_id,
      roles: roles ? roles.split(',') : [],
      custom_params: customParams,
    };

    return { isValid: true, context: ltiContext };
  } catch (error) {
    console.error('LTI validation error:', error);
    return { isValid: false, context: null };
  }
}
