import { prisma } from '../../config/database.js';
import { Prisma, Notification, NotificationType } from '@prisma/client';

export class NotificationsRepository {
  async findMany(params: {
    userId: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  }): Promise<{ data: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = { userId: params.userId };
    if (params.unreadOnly) {
      where.isRead = false;
    }
    if (params.type) {
      where.type = params.type;
    }

    const [data, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findFirst({ where: { id } });
  }

  async markRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  async delete(id: string): Promise<Notification> {
    return prisma.notification.delete({ where: { id } });
  }

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }
}

export const notificationsRepository = new NotificationsRepository();
