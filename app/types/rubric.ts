// 統一的 Rubric 類型定義，適配新的資料庫架構

export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  levels: {
    score: number;
    description: string;
  }[];
}

export interface Rubric {
  id: string;
  name: string;
  description: string;
  version: number;
  isActive: boolean;
  criteria: RubricCriteria[];
  categories?: UICategory[]; // 新增 categories 欄位，向後兼容
  createdAt: Date;
  updatedAt: Date;
}

// 服務層回應類型 (與 Rubric 相同，但保持別名以便未來擴展)
export type RubricResponse = Rubric;

// UI 表單數據類型 (從 rubric-transform.ts 移動過來)
export interface UIRubricData {
  name: string;
  description: string;
  categories: UICategory[];
}

export interface UICategory {
  id: string;
  name: string;
  criteria: UICriterion[];
}

export interface UICriterion {
  id: string;
  name: string;
  description: string;
  levels: UILevel[];
}

export interface UILevel {
  score: number;
  description: string;
}

// 評分相關類型移到 @/types/grading 統一管理
// 保留舊評分格式的相容性類型
export interface LegacyGradingResultData {
  score: number;
  analysis: string;
  analysisMarkdown?: string;
  criteriaScores: {
    name: string;
    score: number;
    comments: string;
    commentsMarkdown?: string;
  }[];
  strengths: string[];
  strengthsMarkdown?: string[];
  improvements: string[];
  improvementsMarkdown?: string[];
  overallSuggestions: string;
  overallSuggestionsMarkdown?: string;
  createdAt: string;
  gradingDuration: number;
}

export interface GradingProgress {
  phase: 'upload' | 'check' | 'grade' | 'verify' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  gradingId?: string;
  error?: string;
}

// 從 @/types/database 重新導出需要的枚舉
export { GradingStatus } from '@/types/database'; 