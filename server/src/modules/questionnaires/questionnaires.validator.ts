import { z } from 'zod';

export const createQuestionnaireSchema = z.object({
  childId: z.string().uuid(),
  responses: z.record(z.any()), // Expects a JSON object/map
  score: z.number().int().optional().nullable(),
});

export const updateQuestionnaireSchema = createQuestionnaireSchema.partial();
