import { PrismaClient } from '@/types/database';

const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5433,
  username: 'test_user',
  password: 'test_password',
  database: 'grading_test_template',
};

export async function setupTestDatabase(): Promise<{
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}> {
  const databaseUrl = `postgresql://${TEST_DB_CONFIG.username}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`;

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  const cleanup = async (): Promise<void> => {
    await resetDatabase(prisma);
    await prisma.$disconnect();
  };

  return { prisma, cleanup };
}

export async function resetDatabase(prisma?: PrismaClient): Promise<void> {
  // Use the global db instance if no prisma instance is provided
  const db = prisma || (await import('@/types/database')).db;

  // Delete in correct order to respect foreign key constraints
  await db.gradingResult.deleteMany();
  await db.gradingSession.deleteMany();
  await db.uploadedFile.deleteMany();
  await db.rubric.deleteMany();
  await db.user.deleteMany();
}
