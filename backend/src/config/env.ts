import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

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

  // Google OAuth — required in production. GOOGLE_CLIENT_ID is a
  // comma-separated list of OAuth client IDs whose ID tokens are accepted (the
  // web client the app passes as webClientId, plus any other client a token
  // may be issued to). Parsed into an array; whitespace and empties ignored.
  GOOGLE_CLIENT_ID: (isProduction
    ? z.string().min(1, 'GOOGLE_CLIENT_ID is required in production')
    : z.string().default('placeholder-google-client-id')
  )
    .transform((v) => v.split(',').map((id) => id.trim()).filter(Boolean))
    .refine((ids) => !isProduction || ids.length > 0, 'GOOGLE_CLIENT_ID is required in production'),
  // Not used: native Google Sign-In only verifies ID tokens, which needs no
  // secret. Accepted (and ignored) so an existing .env that still has it loads.
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // CORS — comma-separated allowed origins
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),

  // CDN
  CDN_BASE_URL: z.string().default('https://dy3um9dzarz6y.cloudfront.net'),

  // Rate limiting overrides (100 requests per minute)
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(100),
  RATE_LIMIT_STRICT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_MODERATE_MAX: z.coerce.number().default(100),
  // Lesson feedback, per signed-in parent per 10 minutes. A lesson costs at
  // most a few requests (rating, a changed star, reasons/comment), plus any
  // backlog an offline device replays on reconnect.
  RATE_LIMIT_FEEDBACK_MAX: z.coerce.number().default(30),

  // Public waitlist (POST /api/waitlist), called by the marketing site.
  // Browser origins allowed to call it cross-origin; comma-separated, exact
  // origins only (scheme + host, no path, no wildcard).
  WAITLIST_ALLOWED_ORIGINS: z
    .string()
    .default('https://petalpath.co.in,https://www.petalpath.co.in')
    .refine(
      (value) =>
        value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .every((origin) => /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)),
      'WAITLIST_ALLOWED_ORIGINS must be exact origins like https://petalpath.co.in (no "*", no path)'
    ),
  // Per client IP per minute, and for the whole route per hour.
  WAITLIST_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(5),
  WAITLIST_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).default(300),

  // Password reset (POST /api/auth/forgot-password, /reset-password). Mounted
  // in every environment. Per client IP per 15 minutes, per email address per
  // hour, and reset attempts per IP per 15 minutes.
  PASSWORD_RESET_PER_IP_MAX: z.coerce.number().int().min(1).default(10),
  PASSWORD_RESET_PER_EMAIL_MAX: z.coerce.number().int().min(1).default(3),
  PASSWORD_RESET_ATTEMPTS_PER_IP_MAX: z.coerce.number().int().min(1).default(20),

  // Deletion (DELETE /api/account, DELETE /api/children/:id), per signed-in
  // parent per 15 minutes, in every environment.
  ACCOUNT_DELETE_MAX: z.coerce.number().int().min(1).default(5),
  CHILD_DELETE_MAX: z.coerce.number().int().min(1).default(20),

  // Email via Amazon SES. Sending is enabled only when SES_FROM and a region
  // (SES_REGION, else AWS_REGION) are both set; otherwise nothing is sent.
  // Empty values count as unset.
  SES_FROM: z.preprocess(blankToUndefined, z.string().email().optional()),
  SES_REGION: z.preprocess(blankToUndefined, z.string().optional()),
  AWS_REGION: z.preprocess(blankToUndefined, z.string().optional()),

  // Address the HTTP server binds to. Defaults to 127.0.0.1 in production
  // (only nginx on the same host can reach it) and 0.0.0.0 elsewhere (a phone
  // on the LAN can reach a dev server).
  HOST: z.string().min(1).default(isProduction ? '127.0.0.1' : '0.0.0.0'),

  // Number of reverse proxies in front of this process that append to
  // X-Forwarded-For: 1 for nginx only, 2 for CloudFront -> nginx. Unset means
  // no proxy is trusted and req.ip is the socket address. Only set it if
  // every request really passes through that many proxies; otherwise clients
  // can forge X-Forwarded-For and dodge per-IP rate limits. See app.ts.
  TRUST_PROXY: z.coerce.number().int().min(1).max(5).optional(),

  // Developer/testing endpoints (force-complete a module, category or skill,
  // unlock a skill). Off unless explicitly "true"; never set it in production.
  ENABLE_DEV_TOOLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Speaking activities in Hindi lessons are unscored practice (no speech
  // recognition, nothing recorded, not required to finish the lesson) until
  // Hindi recognition has been tested on real phones. "true" scores them like
  // every other speaking activity. See shared/utils/lesson-language.ts.
  SPEAK_HINDI_SCORING_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

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

