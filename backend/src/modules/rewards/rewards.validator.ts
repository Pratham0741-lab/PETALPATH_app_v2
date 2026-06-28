import { z } from 'zod';

export const createRewardSchema = z.object({
  childId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  points: z.number().int().nonnegative().optional(),
});

export const updateRewardSchema = createRewardSchema.partial();
