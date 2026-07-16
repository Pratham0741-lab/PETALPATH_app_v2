import { Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export const adminMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'ADMIN') {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
};
