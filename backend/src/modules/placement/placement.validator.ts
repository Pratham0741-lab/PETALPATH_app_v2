import { z } from 'zod';

export const ageGroupEnum = z.enum(['PRE_NURSERY', 'NURSERY', 'LKG', 'UKG']);

export const chooseQuestionnaireSchema = z.object({
  ageGroup: ageGroupEnum.optional(),
  startFromBeginning: z.boolean().optional(),
});

export const startPlacementSchema = z.object({
  childId: z.string().uuid(),
  assessmentId: z.string().uuid(),
});

export const startFromBeginningSchema = z.object({
  childId: z.string().uuid(),
});

export const submitAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string(),
});

export const completePlacementSchema = z.object({
  attemptId: z.string().uuid(),
});

export const placementResultSchema = z.object({
  attemptId: z.string().uuid(),
});

export const restartPlacementSchema = z.object({
  childId: z.string().uuid(),
});
