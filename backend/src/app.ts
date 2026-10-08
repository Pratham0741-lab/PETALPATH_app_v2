import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { rootRouter } from './routes/index.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { waitlistRoutes } from './modules/waitlist/waitlist.routes.js';
import { NotFoundError } from './utils/errors.js';
import { env } from './config/env.js';
import { metricsService } from './modules/metrics/metrics.service.js';
import { authLimiter, moderateLimiter } from './middleware/rate-limit.middleware.js';
import {
  WAITLIST_PATHS,
  isWaitlistPath,
  waitlistCors,
  waitlistErrorHandler,
  waitlistGlobalLimiter,
  waitlistIpLimiter,
} from './modules/waitlist/waitlist.middleware.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/*
 * Reverse proxies. With TRUST_PROXY = N, Express takes req.ip from the
 * X-Forwarded-For entry N hops from the right, i.e. it trusts exactly the N
 * proxies nearest this process:
 *   nginx -> node                    TRUST_PROXY=1
 *   CloudFront -> nginx -> node      TRUST_PROXY=2
 * Unset: no proxy trusted; behind nginx every client would then share
 * nginx's address and one rate-limit bucket. Set it too high, or leave a path
 * where clients can reach node or nginx without passing the proxies counted,
 * and a client can forge X-Forwarded-For to pick its own IP.
 */
if (env.TRUST_PROXY) {
  app.set('trust proxy', env.TRUST_PROXY);
} else if (env.NODE_ENV === 'production') {
  logger.warn('TRUST_PROXY is not set: behind a proxy, per-IP rate limits key on the proxy address');
}

// Security hardening
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://dy3um9dzarz6y.cloudfront.net'],
        mediaSrc: ["'self'", 'https://dy3um9dzarz6y.cloudfront.net'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: false,
    hidePoweredBy: true,
  })
);

// Gzip compression
app.use(compression());

// CORS for the public waitlist: its own origins (WAITLIST_ALLOWED_ORIGINS),
// no credentials. Mounted first so it also answers the preflight.
app.use(WAITLIST_PATHS, waitlistCors);

// CORS (app-wide). Skipped on the waitlist paths, so they never pick up the
// app's credentialed CORS headers.
const allowedOrigins = env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
if (env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:8081', 'http://localhost:19006');
}
const appCors = cors({
  origin: allowedOrigins,
  credentials: true,
});
app.use((req, res, next) => (isWaitlistPath(req.path) ? next() : appCors(req, res, next)));

// Request ID — must run before logger and routes
app.use(requestIdMiddleware);

// Body parser
app.use(express.json());

// Structured HTTP logging
app.use(loggerMiddleware);

// Metrics — track every request
app.use((req, res, next) => {
  metricsService.increment('request.total');
  if ((req as any).user?.userId) {
    metricsService.trackActiveUser((req as any).user.userId);
  }
  const start = Date.now();
  res.on('finish', () => {
    metricsService.recordResponseTime(Date.now() - start);
    if (res.statusCode >= 400) {
      metricsService.increment('request.error');
    }
  });
  next();
});

// Serve static storage files
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Health routes — no rate limiting (monitoring must always be accessible)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Waitlist rate limits, in every environment and on every waitlist path:
// per client IP first, then the route-wide hourly ceiling. Mounted before the
// root alias below, which would otherwise answer first and never be limited.
app.use(WAITLIST_PATHS, waitlistIpLimiter, waitlistGlobalLimiter);

// Waitlist route alias at root level
app.use('/waitlist', waitlistRoutes);

const isProduction = env.NODE_ENV === 'production';

// Rate limiting — applied to /api routes (100 requests per minute)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

if (isProduction) {
  // Per-endpoint rate limiters (applied before the global limiter)
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/session-planner/generate', moderateLimiter);
  app.use('/api/stories', moderateLimiter);
  app.use('/api/assessments', moderateLimiter);
  app.use('/api/notifications', moderateLimiter);
}

// Mount API routes
app.use('/api', isProduction ? apiLimiter : (req, res, next) => next(), rootRouter);

// Catch-all 404
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Waitlist errors raised before its controller (malformed JSON, oversized
// body) keep the waitlist's { ok: false, error } shape.
app.use(WAITLIST_PATHS, waitlistErrorHandler);

// Global Error handler
app.use(errorHandler);

export default app;
