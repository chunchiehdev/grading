import { redis } from '@/lib/redis';
import { db } from '@/lib/db.server';

type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

type ServiceCheck = {
  status: HealthStatus;
  responseTime?: string;
  error?: string;
  consecutiveFailures?: number;
};

type HealthReport = {
  status: HealthStatus;
  checks: {
    database: ServiceCheck;
    redis: ServiceCheck;
  };
  timestamp: string;
};

const failedAttempts = { db: 0, redis: 0 };
const TIMEOUT = 5000;

export async function checkHealth(): Promise<HealthReport> {
  const health: HealthReport = {
    status: 'healthy',
    checks: {
      database: { status: 'healthy' },
      redis: { status: 'healthy' },
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const startTime = Date.now();
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), TIMEOUT)),
    ]);
    health.checks.database = {
      status: 'healthy',
      responseTime: `${Date.now() - startTime}ms`,
    };
    failedAttempts.db = 0;
  } catch (error) {
    failedAttempts.db++;
    health.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      consecutiveFailures: failedAttempts.db,
    };
    health.status = 'unhealthy';
  }

  try {
    const startTime = Date.now();
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), TIMEOUT)),
    ]);
    health.checks.redis = {
      status: 'healthy',
      responseTime: `${Date.now() - startTime}ms`,
    };
    failedAttempts.redis = 0;
  } catch (error) {
    failedAttempts.redis++;
    health.checks.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      consecutiveFailures: failedAttempts.redis,
    };
    health.status = 'unhealthy';
  }

  return health;
}
