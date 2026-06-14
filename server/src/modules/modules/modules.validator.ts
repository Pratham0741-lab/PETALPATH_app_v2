import { z } from 'zod';

export const createModuleSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export const updateModuleSchema = createModuleSchema.partial();
