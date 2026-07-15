import { z } from 'zod';
import { NotificationType, NotificationPriority } from '@prisma/client';

export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
  type: z.nativeEnum(NotificationType).optional(),
});

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  childId: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.nativeEnum(NotificationType),
  priority: z.nativeEnum(NotificationPriority).optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});
