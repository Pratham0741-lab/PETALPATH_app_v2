import { prisma } from '../config/database.js';
import { productionConfig } from '../config/production.js';
import { logger } from '../utils/logger.js';
import { SessionStatus } from '../shared/enums.js';

export async function cleanupExpiredNotifications(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - productionConfig.jobs.notificationRetentionDays);

  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  if (result.count > 0) {
    logger.info({ deleted: result.count }, 'Expired notification cleanup completed');
  }
}

export async function cleanupOldSessions(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - productionConfig.jobs.sessionRetentionDays);

  const oldSessions = await prisma.sessionPlan.findMany({
    where: {
      createdAt: { lt: cutoff },
      status: { in: [SessionStatus.COMPLETED, SessionStatus.ABANDONED] },
    },
    select: { id: true },
  });

  if (oldSessions.length === 0) return;

  const ids = oldSessions.map((s) => s.id);

  await prisma.$transaction([
    prisma.sessionEvent.deleteMany({ where: { sessionPlanId: { in: ids } } }),
    prisma.sessionBlock.deleteMany({ where: { sessionPlanId: { in: ids } } }),
    prisma.sessionPlan.deleteMany({ where: { id: { in: ids } } }),
  ]);

  logger.info({ deleted: ids.length }, 'Old session cleanup completed');
}

export async function cleanupTemporaryData(): Promise<void> {
  // Placeholder for future temp data cleanup (e.g., expired tokens, stale cache).
  // Password reset tokens are stored as a field on the User model and
  // cleared on successful reset — no separate cleanup needed.
}
