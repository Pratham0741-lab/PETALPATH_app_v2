import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';

const pinoHttpFn = (pinoHttp as any).default || pinoHttp;

// Fields that must never appear in logs
const SENSITIVE_KEYS = new Set([
  'password',
  'confirmPassword',
  'token',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'idToken',
  'id_token',
  'googleToken',
  'authorization',
  'jwt',
  'secret',
]);

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return cleaned;
}

export const loggerMiddleware = pinoHttpFn({
  logger: logger as any,
  serializers: {
    req(req: any) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query ? redactObject(req.query) : undefined,
        // Headers deliberately excluded — no Authorization leak
      };
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});

