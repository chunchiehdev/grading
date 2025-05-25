import pino from 'pino';

/**
 * Configured Pino logger instance with environment-based settings
 * - Production: info level logging
 * - Development: debug level logging with pretty printing
 */
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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