import { z } from 'zod';

export const createMentorSchema = z.object({
  childId: z.string().uuid(),
  fullName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export const updateMentorSchema = createMentorSchema.partial();
