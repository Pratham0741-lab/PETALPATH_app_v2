import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().default('super-secret-jwt-key'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-jwt-key'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().default('placeholder-google-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().default('placeholder-google-client-secret'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
