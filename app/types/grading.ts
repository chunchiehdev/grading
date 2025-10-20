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
