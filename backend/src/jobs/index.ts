import { productionConfig } from '../config/production.js';
import { logger } from '../utils/logger.js';
import { cleanupExpiredNotifications, cleanupOldSessions, cleanupTemporaryData } from './cleanup.jobs.js';

const timers: ReturnType<typeof setInterval>[] = [];

export function startJobs(): void {
  const interval = productionConfig.jobs.cleanupIntervalMs;
  logger.info({ intervalMs: interval }, 'Starting scheduled jobs...');

  timers.push(setInterval(async () => {
    try {
      await cleanupExpiredNotifications();
    } catch (error) {
      logger.error(error as Error, 'Notification cleanup job failed');
    }
  }, interval));

  timers.push(setInterval(async () => {
    try {
      await cleanupOldSessions();
    } catch (error) {
      logger.error(error as Error, 'Old session cleanup job failed');
    }
  }, interval));

  timers.push(setInterval(async () => {
    try {
      await cleanupTemporaryData();
    } catch (error) {
      logger.error(error as Error, 'Temporary data cleanup job failed');
    }
  }, interval));

  logger.info('Scheduled jobs started.');
}

export function stopJobs(): void {
  for (const timer of timers) {
    clearInterval(timer);
  }
  timers.length = 0;
  logger.info('Scheduled jobs stopped.');
}
