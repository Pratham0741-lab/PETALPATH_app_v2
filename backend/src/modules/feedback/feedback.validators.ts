import { z } from 'zod';

/** Quick-reason chips on the lesson-complete card, as stored. */
export const FEEDBACK_REASONS = [
  'TOO_EASY',
  'TOO_HARD',
  'TOO_LONG',
  'LOST_INTEREST',
  'LOVED_IT',
] as const;

export const FEEDBACK_COMMENT_MAX = 1000;

export const SubmitFeedbackSchema = z.object({
  /**
   * Client-generated, so the follow-up reasons/comment request and any offline
   * replay land on the same row. Omit to always create a new one.
   */
  id: z.string().uuid('Invalid feedback id.').optional(),
  lessonId: z
    .string({ required_error: 'lessonId is required.' })
    .trim()
    .min(1, 'lessonId is required.')
    .max(128),
  childId: z.string({ required_error: 'childId is required.' }).uuid('Invalid childId.'),
  rating: z
    .number({
      required_error: 'Rating is required.',
      invalid_type_error: 'Rating must be a whole number from 1 to 5.',
    })
    .int('Rating must be a whole number from 1 to 5.')
    .min(1, 'Rating must be a whole number from 1 to 5.')
    .max(5, 'Rating must be a whole number from 1 to 5.'),
  /** Absent = leave the stored reasons alone; `[]` clears them. */
  reasons: z
    .array(z.enum(FEEDBACK_REASONS, { errorMap: () => ({ message: 'Unknown feedback reason.' }) }))
    .max(FEEDBACK_REASONS.length)
    .transform((r) => [...new Set(r)])
    .optional(),
  /**
   * Trimmed before the length check, so padding cannot push a comment over the
   * limit and whitespace-only comes back as no comment. Absent = leave alone.
   */
  comment: z
    .string({ invalid_type_error: 'Comment must be text.' })
    .trim()
    .max(FEEDBACK_COMMENT_MAX, `Comment must be ${FEEDBACK_COMMENT_MAX} characters or less.`)
    .transform((c) => (c.length > 0 ? c : null))
    .nullable()
    .optional(),
  appVersion: z.string().trim().max(32).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
