import { z } from 'zod';

const questionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const createAssessmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  ageGroup: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  thumbnail: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1),
        questionType: z.enum(['MULTIPLE_CHOICE', 'SCALE', 'TEXT', 'BOOLEAN']),
        options: z.array(questionOptionSchema).optional().nullable(),
        order: z.number().int().nonnegative().optional(),
        maxScore: z.number().nonnegative().optional(),
        correctAnswer: z.string().optional().nullable(),
      })
    )
    .min(1, 'At least one question is required'),
});

export const startAttemptSchema = z.object({
  assessmentId: z.string().uuid(),
});

export const submitAttemptSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        answer: z.string(),
      })
    )
    .min(1, 'At least one response is required'),
});
