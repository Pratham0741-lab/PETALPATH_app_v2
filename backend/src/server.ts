import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { logger } from './utils/logger.js';
import { setupGracefulShutdown } from './utils/shutdown.js';
import { startJobs } from './jobs/index.js';

const startServer = async () => {
  try {
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected successfully.');

    const server = app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    });

    setupGracefulShutdown(server);
    startJobs();
  } catch (error) {
    logger.error(error as Error, 'Startup failed');
    process.exit(1);
  }
};

startServer();
