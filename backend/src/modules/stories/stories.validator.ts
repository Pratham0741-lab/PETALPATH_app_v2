import { z } from 'zod';

export const storyListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  readingLevel: z.coerce.number().int().optional(),
  search: z.string().optional(),
});

export const pageStorySchema = z.object({
  pageNumber: z.number().int().min(0),
  readingTime: z.number().int().min(0).optional(),
});

export const completeStorySchema = z.object({
  readingTime: z.number().int().min(0),
});
