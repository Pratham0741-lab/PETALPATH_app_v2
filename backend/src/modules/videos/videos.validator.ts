import { z } from 'zod';

export const createVideoSchema = z.object({
  activityId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  videoKey: z.string().min(1, 'Video key is required'),
  duration: z.number().int().nonnegative().optional(),
  thumbnailKey: z.string().optional().nullable(),
});

export const updateVideoSchema = createVideoSchema.partial();

export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;

