import pino from 'pino';

/**
 * Configured Pino logger instance with environment-based settings
 *
 * Log levels (from lowest to highest):
 * - trace: 最詳細的追蹤資訊
 * - debug: 除錯資訊
 * - info: 一般資訊（預設）
 * - warn: 警告訊息
 * - error: 錯誤訊息
 * - fatal: 致命錯誤
 *
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

/**
 * Default export of the configured logger instance
 * @module logger
 */
export default logger;
