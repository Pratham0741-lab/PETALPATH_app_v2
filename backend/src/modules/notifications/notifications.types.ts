import { Notification, NotificationType, NotificationPriority } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  childId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown> | null;
}

export interface ListNotificationsQuery {
  page: number;
  limit: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListNotificationsResult {
  data: Notification[];
  pagination: PaginationMeta;
}
