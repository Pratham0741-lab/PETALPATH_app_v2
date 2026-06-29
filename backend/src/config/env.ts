import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database — always required
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth secrets — required in production, defaults for local dev
  JWT_SECRET: isProduction
    ? z.string().min(16, 'JWT_SECRET must be at least 16 characters in production')
    : z.string().default('super-secret-jwt-key'),
  JWT_REFRESH_SECRET: isProduction
    ? z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters in production')
    : z.string().default('super-secret-refresh-jwt-key'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // Google OAuth — required in production
  GOOGLE_CLIENT_ID: isProduction
    ? z.string().min(1, 'GOOGLE_CLIENT_ID is required in production')
    : z.string().default('placeholder-google-client-id'),
  GOOGLE_CLIENT_SECRET: isProduction
    ? z.string().min(1, 'GOOGLE_CLIENT_SECRET is required in production')
    : z.string().default('placeholder-google-client-secret'),

  // CDN
  CDN_BASE_URL: z.string().default('https://dy3um9dzarz6y.cloudfront.net'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues
    .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\n❌ Environment validation failed:\n${errors}\n`);
  process.exit(1);
}

export const env = parsed.data;

