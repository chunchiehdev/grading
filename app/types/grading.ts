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

export interface GradingResultData {
  score: number;
  imageUnderstanding?: string;
  analysis: string;
  criteriaScores: {
    name: string;
    score: number;
    comments: string;
  }[];
  strengths: string[];
  improvements: string[];
  overallSuggestions?: string;
  createdAt: Date | string;
  gradingDuration?: number;
}
