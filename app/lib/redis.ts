import { Redis } from 'ioredis';
import { REDIS_CONFIG } from '@/config/redis';

// ============================================================================
// General Redis Connection (for caching, sessions, etc.)
// ============================================================================
const redis = new Redis({
  ...REDIS_CONFIG,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

// ============================================================================
// BullMQ-specific Redis Connection
// ============================================================================
// BullMQ requires maxRetriesPerRequest: null for Worker blocking operations
// This is a separate connection to avoid conflicts with the general connection
const bullmqRedis = new Redis({
  ...REDIS_CONFIG,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null, // REQUIRED: BullMQ Worker needs blocking operations
  enableReadyCheck: false,
  enableOfflineQueue: true,
});

bullmqRedis.on('error', (error) => {
  console.error('BullMQ Redis connection error:', error);
});

export { redis, bullmqRedis };
