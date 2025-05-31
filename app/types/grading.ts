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

export interface GradingResultData {
  score: number;
  imageUnderstanding?: string;
  imageUnderstandingMarkdown?: string;
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
  overallSuggestions?: string;
  overallSuggestionsMarkdown?: string;
  createdAt: Date | string;
  gradingDuration?: number;
}
