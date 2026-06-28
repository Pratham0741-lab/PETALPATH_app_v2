import { z } from 'zod';

export const createActivitySchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(1),
  activityType: z.enum(['video', 'listen', 'speak', 'write']),
  contentUrl: z.string().optional().nullable(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export const updateActivitySchema = createActivitySchema.partial();
