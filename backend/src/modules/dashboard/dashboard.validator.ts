import { z } from 'zod';

export const childIdParamSchema = z.object({
  childId: z.string().uuid('Invalid child ID format'),
});
