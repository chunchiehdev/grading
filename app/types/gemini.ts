import { GradingResultData } from './grading';
import type { DbCriterion, DbRubricCriteria } from '@/schemas/rubric-data';

/**
 * Gemini AI 服務的共用型別定義
 * 統一所有 Gemini 相關服務的介面
 */

// Gemini API Response structures (internal use, not user-facing)
export interface GeminiContentPart {
  text?: string;
  thought?: boolean;
}

export interface GeminiContent {
  parts: GeminiContentPart[];
  role?: string;
}

export interface GeminiCandidate {
  content: GeminiContent;
  finishReason?: string;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  text?: string;
}

// Gemini 評分請求介面 - 文字內容方式
export interface GeminiGradingRequest {
  content: string;
  criteria: DbCriterion[]; // Properly typed as DB criteria
  fileName: string;
  rubricName: string;
  // Feature 004: AI Grading Context
  referenceDocuments?: Array<{ fileId: string; fileName: string; content: string; wasTruncated: boolean }>;
  customInstructions?: string;
  language?: 'zh' | 'en'; // Language for AI feedback
}

// Gemini 檔案評分請求介面 - 直接檔案上傳方式
export interface GeminiFileGradingRequest {
  fileBuffer: Buffer;
  mimeType: string;
  criteria: DbCriterion[]; // Properly typed as DB criteria
  fileName: string;
  rubricName: string;
}

// Gemini 評分回應介面
export interface GeminiGradingResponse {
  success: boolean;
  result?: GradingResultData;
  thoughtSummary?: string; // AI 的思考過程摘要
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    duration: number;
    // Multi-key rotation metadata (optional, only present when rotation enabled)
    keyUsed?: string; // Which API key was used (1, 2, or 3)
    attempts?: number; // Number of retry attempts
    attemptedKeys?: string[]; // Keys that were tried before success
  };
}
