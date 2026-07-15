import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { notificationsService } from './notifications.service.js';
import { listNotificationsSchema, createNotificationSchema } from './notifications.validators.js';
import { ValidationError, ForbiddenError, UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user?.userId) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.userId;
}

export class NotificationsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const parsed = listNotificationsSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const result = await notificationsService.listNotifications(userId, parsed.data);
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async unreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const result = await notificationsService.getUnreadCount(userId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const { id } = req.params;
      const notification = await notificationsService.markAsRead(userId, id);
      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const result = await notificationsService.markAllAsRead(userId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const { id } = req.params;
      const result = await notificationsService.deleteNotification(userId, id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return next(new ForbiddenError('Only administrators can create notifications'));
      }
      const parsed = createNotificationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const notification = await notificationsService.createNotification(parsed.data);
      logger.info({ notificationId: notification.id }, 'notification created');
      return res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
