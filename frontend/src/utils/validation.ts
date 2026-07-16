import { z } from 'zod';

export const emailSchema = z.string().email('Please enter a valid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(50);
export const childNameSchema = z.string().min(1, 'Name is required').max(50);
export const childAgeSchema = z.number().min(2, 'Minimum age is 2').max(18, 'Maximum age is 18');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const passwordWithStrengthSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordWithStrengthSchema,
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordWithStrengthSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const childFormSchema = z.object({
  name: childNameSchema,
  age: childAgeSchema,
  avatar: z.string(),
  mentorId: z.string().nullable().optional(),
});
