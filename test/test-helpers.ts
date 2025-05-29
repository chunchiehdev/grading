import { PrismaClient } from '../app/generated/prisma/client';
import { UserFactory } from './factories/user.factory';
import { RubricFactory } from './factories/rubric.factory';
import { UploadFactory } from './factories/upload.factory';
import { setupTestDatabase } from './database';

export interface TestContext {
  prisma: PrismaClient;
  userFactory: UserFactory;
  rubricFactory: RubricFactory;
  uploadFactory: UploadFactory;
  cleanup: () => Promise<void>;
}

export async function setupTest(): Promise<TestContext> {
  const { prisma, cleanup } = await setupTestDatabase();
  
  const userFactory = new UserFactory(prisma);
  const rubricFactory = new RubricFactory(prisma);
  const uploadFactory = new UploadFactory(prisma);
  
  return {
    prisma,
    userFactory,
    rubricFactory,
    uploadFactory,
    cleanup
  };
}


export async function cleanupTest(context: TestContext): Promise<void> {
  const { prisma } = context;
  
  try {
    // 這有順序要先刪除外鍵
    await prisma.upload.deleteMany();
    await prisma.rubric.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('清理測試資料失敗:', error);
  }
}
