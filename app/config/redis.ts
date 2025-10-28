export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
} as const;

export const REDIS_KEYS = {
  UPLOAD_PROGRESS_PREFIX: 'upload:progress:',
  GRADING_PROGRESS_PREFIX: 'grading:progress:',
  // BullMQ queue keys (auto-managed by BullMQ)
  BULLMQ_QUEUE_PREFIX: 'bull:grading:',
  // BullMQ rate limiter key
  BULLMQ_RATE_LIMITER_KEY: 'bull:rate-limit:gemini-api:',
  EXPIRATION_TIME: 3600,
} as const;
