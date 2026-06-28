import { z } from 'zod';

export const createProgressSchema = z.object({
  childId: z.string().uuid(),
  lessonId: z.string().uuid(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED'),
  completedAt: z.string().datetime().optional().nullable(),
});

export const updateProgressSchema = createProgressSchema.partial();
