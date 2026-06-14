import { z } from 'zod';

export const createLessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().nonnegative().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

export const updateLessonSchema = createLessonSchema.partial();
