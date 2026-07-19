import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { prisma } from '../config/database.js';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.js';

export const assertClassroomAccess = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Fetch user from DB to check role
    const user = await prisma.user.findFirst({
      where: { id: req.user.userId, deletedAt: null },
    });
    if (!user) {
      return next(new UnauthorizedError('User account not found'));
    }

    const role = user.role;
    if (role !== 'TEACHER' && role !== 'MENTOR' && role !== 'ADMIN') {
      return next(new ForbiddenError('Access denied: Teacher role required'));
    }

    const classroomIdParam = req.params.classroomId;
    if (classroomIdParam) {
      // Verify classroom exists and belongs to this teacher (or admin bypass)
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomIdParam },
      });

      if (!classroom) {
        return next(new NotFoundError('Classroom not found'));
      }

      if (role !== 'ADMIN' && classroom.teacherId !== req.user.userId) {
        return next(new ForbiddenError('Access denied: Not authorized for this classroom'));
      }
    }

    const childIdParam = req.params.childId;
    if (childIdParam) {
      // Verify the student exists and is registered in one of this teacher's classrooms
      const student = await prisma.child.findUnique({
        where: { id: childIdParam, deletedAt: null },
      });

      if (!student) {
        return next(new NotFoundError('Learner profile not found'));
      }

      if (role !== 'ADMIN') {
        const enrollment = await prisma.classroomLearner.findFirst({
          where: {
            childId: childIdParam,
            classroom: {
              teacherId: req.user.userId,
            },
          },
        });

        if (!enrollment) {
          return next(new ForbiddenError('Access denied: Learner not in teacher\'s classrooms'));
        }
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
