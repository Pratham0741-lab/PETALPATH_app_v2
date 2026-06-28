import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn({
      message: err.message,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
    });

    // Handle ValidationErrors which might have detailed validation objects
    const validationErrors = (err as any).errors;

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(validationErrors ? { errors: validationErrors } : {}),
    });
  }

  // Unhandled internal errors
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
