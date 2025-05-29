import { PrismaClient } from '../app/generated/prisma/client';

const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5433,
  username: 'test_user',
  password: 'test_password',
  database: 'grading_test_template'
};

export async function setupTestDatabase(): Promise<{
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}> {
  const databaseUrl = `postgresql://${TEST_DB_CONFIG.username}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`;
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  const cleanup = async (): Promise<void> => {
    await prisma.upload.deleteMany();
    await prisma.rubric.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  };

  return { prisma, cleanup };
} 