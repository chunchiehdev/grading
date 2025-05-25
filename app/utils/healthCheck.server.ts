import { redis } from '@/lib/redis';
import { db } from '@/lib/db.server';

/**
 * Health status enumeration for service checks
 * @typedef {'healthy'|'unhealthy'|'degraded'} HealthStatus
 */
type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Type definition for individual service health check result
 * @typedef {Object} ServiceCheck
 * @property {HealthStatus} status - Current health status of the service
 * @property {string} [responseTime] - Response time in milliseconds
 * @property {string} [error] - Error message if service is unhealthy
 * @property {number} [consecutiveFailures] - Number of consecutive failures
 */
type ServiceCheck = {
  status: HealthStatus;
  responseTime?: string;
  error?: string;
  consecutiveFailures?: number;
};

/**
 * Type definition for complete health report
 * @typedef {Object} HealthReport
 * @property {HealthStatus} status - Overall system health status
 * @property {Object} checks - Individual service check results
 * @property {ServiceCheck} checks.database - Database health check result
 * @property {ServiceCheck} checks.redis - Redis health check result
 * @property {string} timestamp - ISO timestamp of the health check
 */
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

/**
 * Performs comprehensive health check of all system services
 * @returns {Promise<HealthReport>} Complete health report with service statuses
 */
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
