import { Redis } from 'ioredis';
import { REDIS_CONFIG } from '~/config/redis';

const redis = new Redis(REDIS_CONFIG);

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

export { redis };