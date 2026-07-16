import { z } from 'zod';

export const startSessionSchema = z.object({
  childId: z.string().uuid(),
  durationMinutes: z.number().int().min(5).max(120),
});

export const resumeSessionSchema = z.object({
  childId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export const endSessionSchema = z.object({
  childId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export const recordProgressSchema = z.object({
  childId: z.string().uuid(),
  sessionId: z.string().uuid(),
  blockId: z.string().uuid(),
  skillId: z.string().uuid(),
  accuracy: z.number().min(0).max(100),
  responseTime: z.number().nonnegative(),
  attempts: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  engagementScore: z.number().min(0).max(100),
  helpRequests: z.number().int().nonnegative(),
  sessionDuration: z.number().nonnegative(),
});
