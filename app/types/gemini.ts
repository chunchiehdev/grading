import { GradingResultData } from './grading';

/**
 * Gemini AI 服務的共用型別定義
 * 統一所有 Gemini 相關服務的介面
 */

// Gemini 評分請求介面 - 文字內容方式
export interface GeminiGradingRequest {
  content: string;
  criteria: any[]; // 向後兼容，保留扁平化格式
  categories?: any[]; // 新增：完整的類別結構
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
  criteria: any[]; // 向後兼容，保留扁平化格式
  categories?: any[]; // 新增：完整的類別結構
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
  };
}
