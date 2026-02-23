/**
 * Prevent hot reloading from creating new instances of PrismaClient
 * https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections?utm_source=chatgpt.com#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
import { PrismaClient, Prisma } from '../generated/prisma/client/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Valid Prisma log levels (note: Prisma doesn't support 'debug', only 'info', 'query', 'warn', 'error')
const validLogLevels: Prisma.LogLevel[] = ['error', 'warn', 'info', 'query'];

// Get log level from environment, validating it
const getLogLevels = (): Prisma.LogLevel[] => {
  if (process.env.PRISMA_LOG_LEVEL && validLogLevels.includes(process.env.PRISMA_LOG_LEVEL as Prisma.LogLevel)) {
    return [process.env.PRISMA_LOG_LEVEL as Prisma.LogLevel];
  }
  return process.env.NODE_ENV === 'development' ? ['info', 'warn', 'error'] : [];
};

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: getLogLevels(),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
