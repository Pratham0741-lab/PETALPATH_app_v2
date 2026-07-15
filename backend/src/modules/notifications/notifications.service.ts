import { notificationsRepository } from './notifications.repository.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { Prisma, Notification } from '@prisma/client';
import {
  CreateNotificationInput,
  ListNotificationsQuery,
  ListNotificationsResult,
} from './notifications.types.js';

export class NotificationsService {
  async listNotifications(
    userId: string,
    query: ListNotificationsQuery
  ): Promise<ListNotificationsResult> {
    const { data, total } = await notificationsRepository.findMany({ userId, ...query });
    const totalPages = Math.ceil(total / query.limit);
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await notificationsRepository.countUnread(userId);
    return { unreadCount };
  }

  async markAsRead(userId: string, id: string): Promise<Notification> {
    const notification = await notificationsRepository.findById(id);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenError('Not authorized for this notification');
    }
    return notificationsRepository.markRead(id);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const updated = await notificationsRepository.markAllRead(userId);
    return { updated };
  }

  async deleteNotification(userId: string, id: string): Promise<{ id: string }> {
    const notification = await notificationsRepository.findById(id);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenError('Not authorized for this notification');
    }
    await notificationsRepository.delete(id);
    return { id };
  }

  async createNotification(data: CreateNotificationInput): Promise<Notification> {
    return notificationsRepository.create({
      user: { connect: { id: data.userId } },
      ...(data.childId ? { child: { connect: { id: data.childId } } } : {}),
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority ?? 'NORMAL',
      ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
    });
  }
}

export const notificationsService = new NotificationsService();
