// ~/types/grading.ts

/**
 * 作業部分的基本結構
 */
export interface Section {
  id: "summary" | "reflection" | "questions";
  title: string;
  content: string;
  placeholder: string;
  maxLength: number;  // 改為必需
  required: boolean;  // 改為必需
  order: number;
  minLength?: number; // 新增最小長度限制
}

/**
 * 評分回饋數據
 */
export interface FeedbackData {
  score: number; // 0-100
  summaryComments: string;
  summaryStrengths: string[];
  reflectionComments: string;
  reflectionStrengths: string[];
  questionComments: string;
  questionStrengths: string[];
  overallSuggestions: string;
  createdAt: Date;  // 改為必需
  gradingDuration: number;  // 改為必需（毫秒）
}

/**
 * 評分狀態
 */
export type GradingStatus =
  | "idle"
  | "processing"
  | "completed"
  | "error";

/**
 * 驗證結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  missingFields?: string[];
  invalidFields?: {
    field: string;
    reason: string;
  }[];
}

/**
 * 評分進度
 */
export interface GradingProgress {
  percentage: number; // 0-100
  currentStep: string;
  estimatedTimeLeft?: number; // 毫秒
}

/**
 * 評分結果
 */
export interface GradingResult {
  status: GradingStatus;
  feedback?: FeedbackData;
  error?: string;
  validationErrors?: string[];
}

/**
 * 作業提交數據
 */
export interface AssignmentSubmission {
  sections: Section[];
  metadata: {  // 改為必需
    submittedAt: Date;
    authorId: string;
    courseId: string;
  };
}