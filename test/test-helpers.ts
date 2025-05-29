import { PrismaClient } from '@/types/database';
import { UserFactory } from './factories/user.factory';
import { RubricFactory } from './factories/rubric.factory';
import { UploadedFileFactory } from './factories/uploaded-file.factory';
import { GradingSessionFactory } from './factories/grading-session.factory';
import { GradingResultFactory } from './factories/grading-result.factory';
import { setupTestDatabase } from './database';

export interface TestContext {
  prisma: PrismaClient;
  userFactory: UserFactory;
  rubricFactory: RubricFactory;
  uploadedFileFactory: UploadedFileFactory;
  gradingSessionFactory: GradingSessionFactory;
  gradingResultFactory: GradingResultFactory;
  cleanup: () => Promise<void>;
}

export async function setupTest(): Promise<TestContext> {
  const { prisma, cleanup } = await setupTestDatabase();
  
  const userFactory = new UserFactory(prisma);
  const rubricFactory = new RubricFactory(prisma);
  const uploadedFileFactory = new UploadedFileFactory(prisma);
  const gradingSessionFactory = new GradingSessionFactory(prisma);
  const gradingResultFactory = new GradingResultFactory(prisma);
  
  return {
    prisma,
    userFactory,
    rubricFactory,
    uploadedFileFactory,
    gradingSessionFactory,
    gradingResultFactory,
    cleanup
  };
}

export async function cleanupTest(context: TestContext): Promise<void> {
  const { prisma } = context;
  
  try {
    // 正確的刪除順序 - 先刪除有外鍵依賴的表
    await prisma.gradingResult.deleteMany();
    await prisma.gradingSession.deleteMany();
    await prisma.uploadedFile.deleteMany();
    await prisma.rubric.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('清理測試資料失敗:', error);
  }
}
