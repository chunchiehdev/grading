export type GradingStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  missingFields?: string[];
  invalidFields?: {
    field: string;
    reason: string;
  }[];
}

export interface GradingProgress {
  percentage: number;
  currentStep: string;
  estimatedTimeLeft?: number;
}

export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  category?: string;
  levels: {
    score: number;
    description: string;
  }[];
}

export interface Rubric {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  criteria: RubricCriteria[];
}

export type ProvocationStrategy = 
  | 'evidence_check'    // L2: 查證數據來源
  | 'logic_gap'         // L3: 指出邏輯跳躍
  | 'counter_argument'  // L3: 提供反方觀點
  | 'warrant_probe'     // L2: 追問理由（取代 clarification）
  | 'metacognitive'     // L3: 詢問寫作選擇
  | 'conceptual';       // L4: 概念辯證（取代 extension）

export interface SparringQuestion {
  related_rubric_id: string;   // 對應的評分維度 ID (用於量化分析)
  target_quote: string;        // 學生文章中的具體引文
  provocation_strategy: ProvocationStrategy; // 策略標籤 (用於質性編碼)
  question: string;            // 顯示給學生的問題
  ai_hidden_reasoning: string; // AI 的評分依據 (揭曉時顯示)
}

// 結構化的整體回饋類型
export interface OverallFeedbackStructured {
  documentStrengths?: string[];
  keyImprovements?: string[];
  nextSteps?: string;
  summary?: string;
}

// 統一的評分結果資料結構 - 支援 Gemini 和 OpenAI
export interface GradingResultData {
  totalScore: number;
  maxScore: number;
  breakdown: Array<{
    criteriaId: string;
    name: string;
    score: number;
    feedback: string;
  }>;
  overallFeedback: string | OverallFeedbackStructured;
  sparringQuestions?: SparringQuestion[];
  sparringResponses?: SparringResponseData[];
  chatHistory?: any[];
}

// 學生對練回應資料結構
export interface SparringResponseData {
  questionIndex: number;
  questionId: string;
  strategy: string;
  response: string;
  respondedAt: string;
  // Dialectical Feedback (1.5 輪對練)
  dialecticalFeedback?: string;
  studentDecision?: 'agree' | 'disagree';
  decisionAt?: string;
}

/**
 * Grading request with optional context (Feature 004)
 * Extends existing grading with assignment context and language
 */
export interface GradingRequest {
  fileId: string;
  rubricId: string;
  assignmentAreaId?: string | null; // Optional assignment context
  language?: 'zh' | 'en' | null; // User interface language for feedback
}

/**
 * Extended grading result with context transparency (Feature 004)
 */
export interface GradingResultWithContext extends GradingResultData {
  usedContext?: {
    assignmentAreaId: string | null;
    referenceFilesUsed: Array<{
      fileId: string;
      fileName: string;
      contentLength: number;
      wasTruncated: boolean;
    }>;
    customInstructionsUsed: boolean;
  };
  gradingModel?: string;
  gradingDuration?: number;
}
