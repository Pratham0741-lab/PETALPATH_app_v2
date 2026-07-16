const LOG_PREFIX = '[PetalPath]';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const formatMessage = (level: LogLevel, tag: string, message: string): string => {
  return `${LOG_PREFIX}[${level}][${tag}] ${message}`;
};

const isDev = (): boolean => {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
};

export const logger = {
  info: (tag: string, message: string, data?: unknown): void => {
    if (!isDev()) return;
    const formatted = formatMessage('INFO', tag, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  },

  warn: (tag: string, message: string, data?: unknown): void => {
    if (!isDev()) return;
    const formatted = formatMessage('WARN', tag, message);
    if (data !== undefined) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  },

  error: (tag: string, message: string, error?: unknown): void => {
    if (!isDev()) return;
    const formatted = formatMessage('ERROR', tag, message);
    if (error instanceof Error) {
      console.error(formatted, error.message, error.stack);
    } else if (error !== undefined) {
      console.error(formatted, error);
    } else {
      console.error(formatted);
    }
  },

  debug: (tag: string, message: string, data?: unknown): void => {
    if (!isDev()) return;
    const formatted = formatMessage('DEBUG', tag, message);
    if (data !== undefined) {
      console.debug(formatted, data);
    } else {
      console.debug(formatted);
    }
  },
};
