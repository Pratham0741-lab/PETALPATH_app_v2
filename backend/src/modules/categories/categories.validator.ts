import { z } from 'zod';

export const createCategorySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
