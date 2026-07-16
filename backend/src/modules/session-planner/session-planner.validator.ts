import { z } from 'zod';

export const planIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const sessionActionSchema = z.object({
  id: z.string().uuid(),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});
