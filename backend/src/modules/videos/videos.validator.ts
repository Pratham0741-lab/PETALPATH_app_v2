import { z } from 'zod';

export const createVideoSchema = z.object({
  activityId: z.string().uuid(),
  videoKey: z.string().min(1),
  duration: z.number().int().nonnegative().optional(),
  thumbnailKey: z.string().optional().nullable(),
});

export const updateVideoSchema = createVideoSchema.partial();

