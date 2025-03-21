// @/types/grading.ts
/**
 * 作業部分的基本結構
 */
export interface Section {
  id: "summary" | "reflection" | "questions";
  title: string;
  content: string;
  placeholder: string;
  maxLength: number;
  required: boolean;
  order: number;
  minLength?: number;
}

/**
 * 評分回饋數據
 */
export interface FeedbackData {
  score: number;
  analysis?: string;  // 完整評分分析
  criteriaScores?: {
    name: string;
    score: number;
    comments: string;
  }[];
  strengths?: string[];  // 文件的優點
  improvements?: string[];  // 需要改進的地方
  overallSuggestions?: string;
  
  // 兼容舊格式
  summaryComments?: string;
  summaryStrengths?: string[];
  reflectionComments?: string;
  reflectionStrengths?: string[];
  questionComments?: string;
  questionStrengths?: string[];
  
  // 元數據
  createdAt: Date;
  gradingDuration: number;
  
  // 完整的LLM輸出，不限制格式
  rawContent?: any;
}

/**
 * 評分狀態
 */
export type GradingStatus = "idle" | "processing" | "completed" | "error";

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
  percentage: number;
  currentStep: string;
  estimatedTimeLeft?: number;
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
  metadata: {
    submittedAt: Date;
    authorId: string;
  };
}

export interface ApiResponse {
  score?: number;
  summaryComments?: string;
  summaryStrengths?: string[];
  reflectionComments?: string;
  reflectionStrengths?: string[];
  questionComments?: string;
  questionStrengths?: string[];
  overallSuggestions?: string;
}

/**
 * 評分標準條目定義
 */
export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // 權重百分比
  levels: {
    score: number;  // 分數層級 (例如1-5)
    description: string; // 該層級的描述
  }[];
}

/**
 * 評分標準集合
 */
export interface Rubric {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  criteria: RubricCriteria[];
  totalWeight: number; // 應該等於100
}