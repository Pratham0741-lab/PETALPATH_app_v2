import { z } from 'zod';

export const createStorySchema = z.object({
  childId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  audioUrl: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export const updateStorySchema = createStorySchema.partial();
