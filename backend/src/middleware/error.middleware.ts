import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const requestId = (req as any).requestId || (req as any).id || 'unknown';

  const logPayload: Record<string, unknown> = {
    requestId,
    message: err.message,
    url: req.originalUrl,
    method: req.method,
  };

  if (err instanceof AppError) {
    logger.warn({ ...logPayload, statusCode: err.statusCode });

    const validationErrors = 'errors' in err ? (err as Record<string, unknown>).errors : undefined;

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId,
      ...(validationErrors ? { errors: validationErrors } : {}),
    });
  }

  logger.error({
    ...logPayload,
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId,
  });
};
