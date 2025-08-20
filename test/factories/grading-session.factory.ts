import { db, GradingSessionStatus } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateGradingSessionOptions {
  userId: string;
  status?: GradingSessionStatus;
  progress?: number;
}

export class GradingSessionFactory {
  static async create(options: CreateGradingSessionOptions) {
    const session = await db.gradingSession.create({
      data: {
        id: uuidv4(),
        userId: options.userId,
        status: options.status || GradingSessionStatus.PENDING,
        progress: options.progress || 0,
      }
    });
    
    console.log(`⚡ Created grading session: ${session.status} (${session.progress}%)`);
    return session;
  }
  
  static async createCompleted(userId: string) {
    return this.create({
      userId,
      status: GradingSessionStatus.COMPLETED,
      progress: 100
    });
  }
  
  static async createProcessing(userId: string, progress: number = 50) {
    return this.create({
      userId,
      status: GradingSessionStatus.PROCESSING,
      progress
    });
  }
}