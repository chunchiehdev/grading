export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
} as const;

export const REDIS_KEYS = {
  PROGRESS_PREFIX: 'grading:progress:',
  UPLOAD_PROGRESS_PREFIX: 'upload:progress:',
  EXPIRATION_TIME: 3600,
} as const;
