/**
 * Child Ownership Middleware
 *
 * Ensures a request that includes a `:childId` URL parameter is authorized
 * for that specific child — closing IDOR/BOLA gaps where an authenticated
 * user could otherwise substitute another user's child id.
 *
 * MUST be mounted AFTER `authMiddleware`.
 *
 * Authorization logic:
 *   1. If the JWT already carries a `childId` claim (the parent selected an
 *      active child during login), require it to match the URL param.
 *      `authMiddleware` has already verified that the JWT `childId` belongs
 *      to the authenticated user.
 *   2. Otherwise (the JWT has no `childId` claim), look up the child in the
 *      database and confirm its `userId` matches the authenticated user.
 *
 * A missing or soft-deleted child returns 404. A mismatch returns 403.
 *
 * @see docs/adaptive-engine/design-spec.md §4.5
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { prisma } from '../config/database.js';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.js';

export const assertChildOwnership = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const childIdParam = req.params.childId;
    if (!childIdParam) {
      return next(new ValidationError('Missing childId in request path'));
    }

    // Fast path: JWT already scoped to a child; require an exact match.
    if (req.user.childId) {
      if (req.user.childId !== childIdParam) {
        return next(new ForbiddenError('Not authorized for this child profile'));
      }
      return next();
    }

    // Fallback path: verify DB ownership.
    const child = await prisma.child.findFirst({
      where: {
        id: childIdParam,
        deletedAt: null,
      },
      select: { userId: true },
    });

    if (!child) {
      return next(new NotFoundError('Child profile not found'));
    }
    if (child.userId !== req.user.userId) {
      return next(new ForbiddenError('Not authorized for this child profile'));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
