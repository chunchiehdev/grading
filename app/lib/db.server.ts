/**
 * Prevent hot reloading from creating new instances of PrismaClient
 * https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections?utm_source=chatgpt.com#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
