import { z } from 'zod';

export const JoinWaitlistSchema = z.object({
  email: z
    .string({
      required_error: 'Please enter a valid email address.',
      invalid_type_error: 'Please enter a valid email address.',
    })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
});

export type JoinWaitlistInput = z.infer<typeof JoinWaitlistSchema>;
