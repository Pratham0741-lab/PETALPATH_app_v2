import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['PARENT', 'ADMIN', 'MENTOR']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });
