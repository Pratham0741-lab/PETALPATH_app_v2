import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { prisma } from '../config/database.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.js';

export const assertAnalyticsAccess = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Fetch user from DB to verify role
    const user = await prisma.user.findFirst({
      where: { id: req.user.userId, deletedAt: null },
    });
    if (!user) {
      return next(new UnauthorizedError('User account not found'));
    }

    const { id: userId, role } = user;

    const childIdParam = req.params.childId;
    if (childIdParam) {
      if (role === 'TEACHER' || role === 'MENTOR') {
        const enrollment = await prisma.classroomLearner.findFirst({
          where: {
            childId: childIdParam,
            classroom: {
              teacherId: userId,
            },
          },
        });
        if (!enrollment) {
          return next(new ForbiddenError('Access denied: Learner not in teacher\'s classrooms'));
        }
      } else if (role === 'PARENT') {
        const child = await prisma.child.findFirst({
          where: { id: childIdParam, deletedAt: null },
          select: { userId: true },
        });
        if (!child) {
          return next(new NotFoundError('Learner profile not found'));
        }
        if (child.userId !== userId) {
          return next(new ForbiddenError('Access denied: Not authorized for this child profile'));
        }
      } else if (role !== 'ADMIN') {
        return next(new ForbiddenError('Access denied: Unauthorized role'));
      }
    }

    const classroomIdParam = req.params.classroomId;
    if (classroomIdParam) {
      if (role === 'TEACHER' || role === 'MENTOR') {
        const classroom = await prisma.classroom.findUnique({
          where: { id: classroomIdParam },
        });
        if (!classroom) {
          return next(new NotFoundError('Classroom not found'));
        }
        if (classroom.teacherId !== userId) {
          return next(new ForbiddenError('Access denied: Not authorized for this classroom'));
        }
      } else if (role !== 'ADMIN') {
        return next(new ForbiddenError('Access denied: Classroom access requires teacher or admin role'));
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
