import { z } from 'zod';

export const overviewQuerySchema = z.object({
  childId: z.string().uuid().optional(),
});

export const activityQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  childId: z.string().uuid().optional(),
});

export const progressQuerySchema = z.object({
  childId: z.string().uuid().optional(),
});

export const rewardsQuerySchema = z.object({
  childId: z.string().uuid().optional(),
});

export const timelineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  childId: z.string().uuid().optional(),
});
