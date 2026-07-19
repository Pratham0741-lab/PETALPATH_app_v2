import { Server } from 'http';
import { prisma } from '../config/database.js';
import { logger } from './logger.js';
import { stopJobs } from '../jobs/index.js';

let isShuttingDown = false;

export function setupGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Shutting down gracefully...');

    stopJobs();

    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }

    server.close(async () => {
      logger.info('HTTP server closed.');
      await prisma.$disconnect();
      logger.info('Database disconnected.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2'));
}
