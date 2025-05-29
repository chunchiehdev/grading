import { PrismaClient, GradingResult, GradingStatus } from '@/types/database';

export interface CreateGradingResultData {
  gradingSessionId: string;
  uploadedFileId: string;
  rubricId: string;
  status?: GradingStatus;
  progress?: number;
  result?: any;
  errorMessage?: string;
  gradingModel?: string;
  gradingTokens?: number;
  gradingDuration?: number;
  completedAt?: Date;
}

export class GradingResultFactory {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateGradingResultData): Promise<GradingResult> {
    const resultData = {
      gradingSessionId: data.gradingSessionId,
      uploadedFileId: data.uploadedFileId,
      rubricId: data.rubricId,
      status: data.status || GradingStatus.PENDING,
      progress: data.progress || 0,
      result: data.result,
      errorMessage: data.errorMessage,
      gradingModel: data.gradingModel,
      gradingTokens: data.gradingTokens,
      gradingDuration: data.gradingDuration,
      completedAt: data.completedAt,
    };

    return this.prisma.gradingResult.create({
      data: resultData
    });
  }

  async createCompleted(data: Omit<CreateGradingResultData, 'status' | 'progress' | 'result' | 'completedAt'>): Promise<GradingResult> {
    const sampleResult = {
      totalScore: 85,
      maxScore: 100,
      breakdown: [
        {
          criteriaId: 'criteria-1',
          score: 85,
          feedback: 'Good work overall with room for improvement in some areas.'
        }
      ],
      overallFeedback: 'This is a well-written piece that demonstrates good understanding of the topic.'
    };

    return this.create({
      ...data,
      status: GradingStatus.COMPLETED,
      progress: 100,
      result: sampleResult,
      gradingModel: 'gpt-4',
      gradingTokens: 2500,
      gradingDuration: 5000, // 5 seconds
      completedAt: new Date(),
    });
  }

  async createFailed(data: Omit<CreateGradingResultData, 'status' | 'progress' | 'errorMessage'>): Promise<GradingResult> {
    return this.create({
      ...data,
      status: GradingStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to parse document content',
    });
  }

  async createProcessing(data: Omit<CreateGradingResultData, 'status' | 'progress'>): Promise<GradingResult> {
    return this.create({
      ...data,
      status: GradingStatus.PROCESSING,
      progress: 50,
      gradingModel: 'gpt-4',
    });
  }

  async createPending(data: Omit<CreateGradingResultData, 'status' | 'progress'>): Promise<GradingResult> {
    return this.create({
      ...data,
      status: GradingStatus.PENDING,
      progress: 0,
    });
  }

  async createWithScore(
    data: Omit<CreateGradingResultData, 'status' | 'progress' | 'result' | 'completedAt'>,
    score: number,
    maxScore: number = 100
  ): Promise<GradingResult> {
    const result = {
      totalScore: score,
      maxScore: maxScore,
      breakdown: [
        {
          criteriaId: 'criteria-1',
          score: score,
          feedback: `Score: ${score}/${maxScore}`
        }
      ],
      overallFeedback: `Overall score: ${score}/${maxScore}`
    };

    return this.create({
      ...data,
      status: GradingStatus.COMPLETED,
      progress: 100,
      result: result,
      gradingModel: 'gpt-4',
      gradingTokens: 1800,
      gradingDuration: 3000,
      completedAt: new Date(),
    });
  }
} 