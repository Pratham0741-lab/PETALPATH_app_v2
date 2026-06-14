import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';

const pinoHttpFn = (pinoHttp as any).default || pinoHttp;

export const loggerMiddleware = pinoHttpFn({
  logger: logger as any,
  serializers: {
    req(req: any) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
      };
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
