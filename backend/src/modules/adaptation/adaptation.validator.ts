import { z } from 'zod';

export const analyzeAdaptationSchema = z.object({
  childId: z.string().uuid(),
});

export const childIdParamSchema = z.object({
  childId: z.string().uuid(),
});
