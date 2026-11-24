import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { prisma } from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    childId?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    // Verify user exists and is not deleted
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null },
    });
    if (!user) {
      return next(new UnauthorizedError('User account not found'));
    }

    // A password reset revokes every session: access tokens issued before the
    // change are refused. iat has whole-second resolution, so a token from the
    // same second as the reset is refused too (it may predate the reset).
    const issuedAt = decoded.iat;
    if (
      user.passwordChangedAt &&
      typeof issuedAt === 'number' &&
      issuedAt <= Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return next(new UnauthorizedError('Session ended because the password was changed'));
    }

    if (decoded.childId) {
      // Verify child exists, is not deleted, and belongs to the user
      const child = await prisma.child.findFirst({
        where: { id: decoded.childId, userId: decoded.userId, deletedAt: null },
      });
      if (!child) {
        return next(new UnauthorizedError('Selected child profile not found or deleted'));
      }
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      childId: decoded.childId,
    };
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired authentication token'));
  }
};
