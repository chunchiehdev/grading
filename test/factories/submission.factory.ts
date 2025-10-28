import { db, SubmissionStatus } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateSubmissionOptions {
  studentId: string;
  assignmentAreaId: string;
  filePath?: string;
  aiAnalysisResult?: Record<string, any>;
  thoughtSummary?: string;
  finalScore?: number;
  normalizedScore?: number;
  usedContext?: Record<string, any>;
  teacherFeedback?: string;
  status?: SubmissionStatus;
}

export class SubmissionFactory {
  static async create(options: CreateSubmissionOptions) {
    const submission = await db.submission.create({
      data: {
        id: uuidv4(),
        studentId: options.studentId,
        assignmentAreaId: options.assignmentAreaId,
        filePath: options.filePath || `uploads/${uuidv4()}/submission.pdf`,
        ...(options.aiAnalysisResult && { aiAnalysisResult: options.aiAnalysisResult }),
        thoughtSummary: options.thoughtSummary ?? null,
        finalScore: options.finalScore ?? null,
        normalizedScore: options.normalizedScore ?? null,
        ...(options.usedContext && { usedContext: options.usedContext }),
        teacherFeedback: options.teacherFeedback ?? null,
        status: options.status || SubmissionStatus.SUBMITTED,
      },
    });

    console.log(`📤 Created submission: student ${options.studentId.substring(0, 8)} for assignment ${options.assignmentAreaId.substring(0, 8)}`);
    return submission;
  }

  static async createCompleted(options: Omit<CreateSubmissionOptions, 'status' | 'finalScore' | 'normalizedScore'>, finalScore: number = 85, normalizedScore: number = 85) {
    return this.create({
      ...options,
      status: SubmissionStatus.GRADED,
      finalScore,
      normalizedScore,
      aiAnalysisResult: options.aiAnalysisResult || {
        totalScore: finalScore,
        maxScore: 100,
        breakdown: [
          { criteriaId: 'content', name: 'Content Quality', score: 30, feedback: 'Good content quality' },
          { criteriaId: 'organization', name: 'Organization', score: 30, feedback: 'Well organized' },
          { criteriaId: 'grammar', name: 'Grammar & Style', score: 25, feedback: 'Minor grammar issues' },
        ],
        overallFeedback: `Overall score: ${finalScore}/100`,
      },
    });
  }

  static async createProcessing(options: Omit<CreateSubmissionOptions, 'status'>) {
    return this.create({
      ...options,
      status: SubmissionStatus.ANALYZED,
    });
  }

  static async createFailed(options: Omit<CreateSubmissionOptions, 'status'>, errorReason: string = 'Failed to analyze submission') {
    return this.create({
      ...options,
      status: SubmissionStatus.SUBMITTED,
      teacherFeedback: `Error: ${errorReason}`,
    });
  }

  static async createMany(studentIds: string[], assignmentAreaId: string, options: Omit<CreateSubmissionOptions, 'studentId' | 'assignmentAreaId'> = {}) {
    const submissions = [];
    for (const studentId of studentIds) {
      submissions.push(
        await this.create({
          ...options,
          studentId,
          assignmentAreaId,
        })
      );
    }
    return submissions;
  }

  static async createDraft(options: Omit<CreateSubmissionOptions, 'status'>) {
    return this.create({
      ...options,
      status: SubmissionStatus.DRAFT,
    });
  }
}
