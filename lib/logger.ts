type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';

const formatMessage = (
  level: LogLevel,
  message: string,
  context?: LogContext
): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
};

const createLogger =
  (level: LogLevel, consoleFn: typeof console.log) =>
  (message: string, context?: LogContext) => {
    if (level === 'info' || level === 'debug') {
      if (!isDev) return;
    }
    consoleFn(formatMessage(level, message, context));
  };

export const logger = {
  info: createLogger('info', console.log),
  warn: createLogger('warn', console.warn),
  error: createLogger('error', console.error),
  debug: createLogger('debug', console.debug),
} as const;
