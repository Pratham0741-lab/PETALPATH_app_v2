import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { rootRouter } from './routes/index.js';
import { NotFoundError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security hardening
app.disable('x-powered-by');
app.use(
  helmet({
    // Content Security Policy
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
    // Prevent clickjacking — DENY since this is a pure API
    frameguard: { action: 'deny' },
    // Prevent MIME-type sniffing
    xContentTypeOptions: true,
    // Control referrer information
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Allow cross-origin resource fetching (mobile app needs /storage assets)
    crossOriginResourcePolicy: false,
    // hidePoweredBy is redundant with app.disable() above but belt-and-suspenders
    hidePoweredBy: true,
  })
);

// Gzip compression
app.use(compression());

// Standard middlewares
app.use(cors({
  origin: [
    "http://localhost:8081",
    "http://localhost:19006",
    "http://13.235.178.117"
  ],
  credentials: true
}));
app.use(express.json());
app.use(loggerMiddleware);

// Serve static storage files (videos and thumbnails)
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Rate limiting — applied only to /api
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

// Mount API routes
app.use('/api', apiLimiter, rootRouter);

// Catch-all 404 Route handler
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Global Error handler
app.use(errorHandler);

export default app;
