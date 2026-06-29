import { z } from 'zod';

export const createChildSchema = z.object({
  name: z.string().min(1, 'Name must be at least 1 character long').max(30, 'Name must be at most 30 characters long'),
  age: z.number().int().min(2, 'Minimum age is 2').max(6, 'Maximum age is 6'),
  avatar: z.string().min(1, 'Avatar identifier is required'),
  mentorId: z.string().uuid().optional().nullable(),
});

export const updateChildSchema = createChildSchema.partial();

export type CreateChildInput = z.infer<typeof createChildSchema>;
export type UpdateChildInput = z.infer<typeof updateChildSchema>;
