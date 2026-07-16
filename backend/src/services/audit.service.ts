import { logger } from '../utils/logger.js';

type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'story.completed'
  | 'assessment.completed'
  | 'session.generated'
  | 'session.started'
  | 'session.completed'
  | 'session.abandoned'
  | 'curriculum.activated'
  | 'reward.unlocked'
  | 'notification.sent';

export function auditLog(
  action: AuditAction,
  metadata: {
    userId?: string;
    childId?: string;
    resourceId?: string;
    [key: string]: unknown;
  }
): void {
  logger.info({
    audit: true,
    action,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}
