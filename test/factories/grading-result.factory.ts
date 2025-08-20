import { db, GradingStatus } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateGradingResultOptions {
  gradingSessionId: string;
  uploadedFileId: string;
  rubricId: string;
  status?: GradingStatus;
  progress?: number;
  result?: any;
  errorMessage?: string | null;
  gradingModel?: string | null;
  gradingTokens?: number | null;
  gradingDuration?: number | null;
}

export class GradingResultFactory {
  static defaultResult = {
    totalScore: 85,
    maxScore: 100,
    breakdown: [
      {
        criteriaId: 'content-quality',
        name: 'Content Quality',
        score: 35,
        feedback: 'Excellent analysis with clear arguments and supporting evidence.'
      },
      {
        criteriaId: 'organization',
        name: 'Organization',
        score: 25,
        feedback: 'Well-structured with logical flow between ideas.'
      },
      {
        criteriaId: 'grammar-style',
        name: 'Grammar & Style',
        score: 25,
        feedback: 'Professional writing with minimal errors.'
      }
    ],
    overallFeedback: 'Strong work overall. The analysis demonstrates clear understanding of the topic with well-supported arguments. Minor improvements could be made in the conclusion section.'
  };

  static async create(options: CreateGradingResultOptions) {
    const gradingResult = await db.gradingResult.create({
      data: {
        id: uuidv4(),
        gradingSessionId: options.gradingSessionId,
        uploadedFileId: options.uploadedFileId,
        rubricId: options.rubricId,
        status: options.status || GradingStatus.PENDING,
        progress: options.progress || 0,
        result: options.result || null,
        errorMessage: options.errorMessage || null,
        gradingModel: options.gradingModel || null,
        gradingTokens: options.gradingTokens || null,
        gradingDuration: options.gradingDuration || null,
        completedAt: options.status === GradingStatus.COMPLETED ? new Date() : null,
      }
    });
    
    console.log(`🎯 Created grading result: ${gradingResult.status} (${gradingResult.progress}%)`);
    return gradingResult;
  }
  
  static async createCompleted(options: Omit<CreateGradingResultOptions, 'status' | 'progress' | 'result'>, customResult?: any) {
    return this.create({
      ...options,
      status: GradingStatus.COMPLETED,
      progress: 100,
      result: customResult || this.defaultResult,
      gradingModel: 'gemini-1.5-pro',
      gradingTokens: 1247,
      gradingDuration: 3500, // 3.5 seconds
    });
  }
  
  static async createProcessing(options: Omit<CreateGradingResultOptions, 'status' | 'progress'>, progress: number = 50) {
    return this.create({
      ...options,
      status: GradingStatus.PROCESSING,
      progress,
      gradingModel: 'gemini-1.5-pro',
    });
  }
  
  static async createFailed(options: Omit<CreateGradingResultOptions, 'status' | 'errorMessage'>, errorMessage: string) {
    return this.create({
      ...options,
      status: GradingStatus.FAILED,
      progress: 0,
      result: null,
      errorMessage,
    });
  }
  
  // Simulate different AI provider results
  static async createGeminiResult(options: Omit<CreateGradingResultOptions, 'status' | 'result' | 'gradingModel'>) {
    return this.create({
      ...options,
      status: GradingStatus.COMPLETED,
      progress: 100,
      result: {
        ...this.defaultResult,
        provider: 'gemini',
        method: 'file_upload'
      },
      gradingModel: 'gemini-1.5-pro',
      gradingTokens: 1247,
      gradingDuration: 2800,
    });
  }
  
  static async createOpenAIResult(options: Omit<CreateGradingResultOptions, 'status' | 'result' | 'gradingModel'>) {
    return this.create({
      ...options,
      status: GradingStatus.COMPLETED,
      progress: 100,
      result: {
        ...this.defaultResult,
        totalScore: 82, // Slightly different scoring
        provider: 'openai',
        method: 'assistant_api'
      },
      gradingModel: 'gpt-4',
      gradingTokens: 1856,
      gradingDuration: 4200,
    });
  }
}