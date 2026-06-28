import { z } from 'zod';

export const performanceRecordSchema = z.object({
  accuracy: z.number().min(0).max(100),
  responseTime: z.number().nonnegative(),
  attempts: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  engagementScore: z.number().min(0).max(100),
  helpRequests: z.number().int().nonnegative(),
  sessionDuration: z.number().nonnegative(),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

export const updateMasterySchema = z.object({
  childId: z.string().uuid().optional(),
  skillId: z.string().uuid(),
  performance: performanceRecordSchema,
});

export type PerformanceRecordDto = z.infer<typeof performanceRecordSchema>;
export type UpdateMasteryDto = z.infer<typeof updateMasterySchema>;
