import { Redis } from 'ioredis';
import { REDIS_CONFIG } from '@/config/redis';

const redis = new Redis({
  ...REDIS_CONFIG,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

export { redis };
