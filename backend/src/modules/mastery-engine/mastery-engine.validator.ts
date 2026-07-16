import { z } from 'zod';

export const evaluateMasterySchema = z.object({
  childId: z.string().uuid(),
  skillId: z.string().uuid(),
  accuracy: z.number().min(0).max(100),
  responseTime: z.number().nonnegative(),
  attempts: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  engagementScore: z.number().min(0).max(100),
  helpRequests: z.number().int().nonnegative(),
  sessionDuration: z.number().nonnegative(),
  timestamp: z.string().datetime().optional(),
});

export const processRevisionSchema = z.object({
  childId: z.string().uuid(),
  skillId: z.string().uuid(),
  accuracy: z.number().min(0).max(100),
  responseTime: z.number().nonnegative(),
  attempts: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  engagementScore: z.number().min(0).max(100),
  helpRequests: z.number().int().nonnegative(),
  sessionDuration: z.number().nonnegative(),
  timestamp: z.string().datetime().optional(),
});

export const skillIdParamSchema = z.object({
  skillId: z.string().uuid(),
});
