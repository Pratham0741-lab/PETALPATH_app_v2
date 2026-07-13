import { z } from 'zod';

export const classifyAllSchema = z.object({
  childId: z.string().uuid(),
  metricSnapshots: z.array(z.record(z.unknown())),
});

export const getClassificationResultSchema = z.object({
  childId: z.string().uuid(),
});

export type ClassifyAllInput = z.infer<typeof classifyAllSchema>;
export type GetClassificationResultInput = z.infer<typeof getClassificationResultSchema>;