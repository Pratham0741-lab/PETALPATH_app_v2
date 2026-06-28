import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { rootRouter } from './routes/index.js';
import { NotFoundError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(loggerMiddleware);

// Serve static storage files (videos and thumbnails)
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Mount API routes
app.use('/api', rootRouter);

// Catch-all 404 Route handler
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Global Error handler
app.use(errorHandler);

export default app;
