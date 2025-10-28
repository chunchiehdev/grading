import { GradingResultData } from './grading';
import type { DbCriterion } from '@/schemas/rubric-data';

/**
 * OpenAI AI 服務的共用型別定義
 * 統一所有 OpenAI 相關服務的介面
 */

// OpenAI 評分請求介面
export interface OpenAIGradingRequest {
  content: string;
  criteria: DbCriterion[]; // Properly typed as DB criteria
  fileName: string;
  rubricName: string;
  language?: 'zh' | 'en'; // Language for AI feedback
}

// OpenAI 評分回應介面
export interface OpenAIGradingResponse {
  success: boolean;
  result?: GradingResultData;
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    duration: number;
  };
}
