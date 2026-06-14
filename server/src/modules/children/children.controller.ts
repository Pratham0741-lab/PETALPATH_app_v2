import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { childrenService } from './children.service.js';
import { createChildSchema, updateChildSchema } from './children.validator.js';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';

export class ChildrenController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const children = await childrenService.getAllChildren(userId);
      return res.status(200).json({
        success: true,
        data: children,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const child = await childrenService.getChildById(id, userId);
      return res.status(200).json({
        success: true,
        data: child,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = createChildSchema.safeParse(req.body);
      if (!validated.success) {
        throw new ValidationError('Invalid request payload', validated.error.format());
      }
      
      const child = await childrenService.createChild(userId, validated.data);
      logger.info({ childId: child.id, userId }, 'Child created');
      
      return res.status(201).json({
        success: true,
        data: child,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      
      const validated = updateChildSchema.safeParse(req.body);
      if (!validated.success) {
        throw new ValidationError('Invalid request payload', validated.error.format());
      }
      
      const currentChild = await childrenService.getChildById(id, userId);
      const child = await childrenService.updateChild(id, userId, validated.data);
      
      logger.info({ childId: child.id, userId }, 'Child updated');
      
      if (validated.data.mentorId !== undefined && validated.data.mentorId !== currentChild.mentorId) {
        logger.info({ childId: child.id, mentorId: validated.data.mentorId }, 'Mentor changed');
      }
      
      return res.status(200).json({
        success: true,
        data: child,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      
      await childrenService.deleteChild(id, userId);
      logger.info({ childId: id, userId }, 'Child deleted');
      
      return res.status(200).json({
        success: true,
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const childrenController = new ChildrenController();
