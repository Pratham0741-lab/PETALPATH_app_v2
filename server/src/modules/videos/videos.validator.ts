import { z } from 'zod';

export const createVideoSchema = z.object({
  activityId: z.string().uuid(),
  videoUrl: z.string().min(1),
  duration: z.number().int().nonnegative().optional(),
  thumbnailUrl: z.string().optional().nullable(),
});

export const updateVideoSchema = createVideoSchema.partial();
