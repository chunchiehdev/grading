import { PrismaClient, GradingSession, GradingSessionStatus } from '@/types/database';

export interface CreateGradingSessionData {
  userId: string;
  status?: GradingSessionStatus;
  progress?: number;
}

export class GradingSessionFactory {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateGradingSessionData): Promise<GradingSession> {
    const sessionData = {
      userId: data.userId,
      status: data.status || GradingSessionStatus.PENDING,
      progress: data.progress || 0,
    };

    return this.prisma.gradingSession.create({
      data: sessionData
    });
  }

  async createMany(count: number, userId: string): Promise<GradingSession[]> {
    const sessions: GradingSession[] = [];
    for (let i = 0; i < count; i++) {
      sessions.push(await this.create({
        userId,
        status: i % 2 === 0 ? GradingSessionStatus.PENDING : GradingSessionStatus.COMPLETED,
        progress: i % 2 === 0 ? 0 : 100,
      }));
    }
    return sessions;
  }

  async createWithStatus(userId: string, status: GradingSessionStatus): Promise<GradingSession> {
    const progress = status === GradingSessionStatus.COMPLETED ? 100 :
                    status === GradingSessionStatus.PROCESSING ? 50 : 0;

    return this.create({
      userId,
      status,
      progress,
    });
  }

  async createProcessingSession(userId: string): Promise<GradingSession> {
    return this.create({
      userId,
      status: GradingSessionStatus.PROCESSING,
      progress: 25,
    });
  }

  async createCompletedSession(userId: string): Promise<GradingSession> {
    return this.create({
      userId,
      status: GradingSessionStatus.COMPLETED,
      progress: 100,
    });
  }

  async createFailedSession(userId: string): Promise<GradingSession> {
    return this.create({
      userId,
      status: GradingSessionStatus.FAILED,
      progress: 0,
    });
  }
} 