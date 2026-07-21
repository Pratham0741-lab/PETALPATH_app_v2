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
    ? z.string()
    : z.string().default('super-secret-jwt-key'),
  JWT_REFRESH_SECRET: isProduction
    ? z.string()
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

  // CORS — comma-separated allowed origins
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),

  // CDN
  CDN_BASE_URL: z.string().default('https://dy3um9dzarz6y.cloudfront.net'),

  // Rate limiting overrides
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(100),
  RATE_LIMIT_STRICT_MAX: z.coerce.number().default(10),
  RATE_LIMIT_MODERATE_MAX: z.coerce.number().default(50),

  // Jobs
  JOBS_CLEANUP_INTERVAL_MINUTES: z.coerce.number().default(60),
  NOTIFICATION_RETENTION_DAYS: z.coerce.number().default(30),
  SESSION_RETENTION_DAYS: z.coerce.number().default(90),
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

// Fail-fast: production deployments must use secure, non-default JWT secrets.
// The application must never start with known/weak secrets in production.
if (isProduction) {
  const secretErrors: string[] = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    secretErrors.push(
      'Missing required environment variable JWT_SECRET.\n' +
      'Production deployments require secure secrets (minimum 32 characters).'
    );
  }
  if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 32) {
    secretErrors.push(
      'Missing required environment variable JWT_REFRESH_SECRET.\n' +
      'Production deployments require secure secrets (minimum 32 characters).'
    );
  }
  if (secretErrors.length > 0) {
    console.error(`\n❌ ${secretErrors.join('\n')}\n`);
    process.exit(1);
  }
}

