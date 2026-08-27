import { z } from 'zod';

export const JoinWaitlistSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter your name.',
      invalid_type_error: 'Please enter your name.',
    })
    .trim()
    .min(1, 'Please enter your name.')
    .max(100, 'Name must be 100 characters or less.'),
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
