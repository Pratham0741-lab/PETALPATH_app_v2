import { z } from 'zod';

/**
 * Honeypot. The marketing site renders this as a visually hidden, unlabelled
 * input that people never fill. A non-empty value means a bot: the controller
 * answers with the normal success response and stores nothing.
 */
export const HONEYPOT_FIELD = 'website';

/**
 * Accepted from two clients: the app's JoinWaitlistForm ({ name, email }) and
 * the marketing site ({ email, name?, source_page, website }). Unknown fields
 * are rejected (.strict()), so nothing else can be smuggled into a row.
 */
export const JoinWaitlistSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).email(),
    name: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => (value ? value : undefined)),
    source_page: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9/_.-]+$/)
      .optional(),
    [HONEYPOT_FIELD]: z.string().max(200).optional(),
  })
  .strict();

export type JoinWaitlistInput = z.infer<typeof JoinWaitlistSchema>;
