import pino from 'pino';

type LogFn = {
  <T extends object>(obj: T, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
};

export interface AppLogger {
  level: string;
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
  silent: LogFn;
  child(bindings: Record<string, unknown>): AppLogger;
  isLevelEnabled(level: string): boolean;
  flush(cb?: (err?: Error) => void): void;
}

const logger: AppLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  },
}) as unknown as AppLogger;

export default logger;
