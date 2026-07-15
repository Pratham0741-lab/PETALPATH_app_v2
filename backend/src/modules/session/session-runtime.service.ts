/**
 * Session Runtime
 *
 * The runtime decides whether a lifecycle action is allowed.
 * It enforces the session state machine, the one-active-session rule,
 * and computes resume position.  No Prisma queries — only pure
 * validation against passed-in state.
 *
 * Valid transitions (SessionStatus):
 *
 *   GENERATED ──start──→ STARTED ──pause──→ PAUSED ──resume──→ STARTED
 *       │                  │  │                              │
 *       │                  │  └──complete──→ COMPLETED       │
 *       └──abandon──→ ABANDONED  ──abandon──→ ABANDONED     │
 *                                                           └──abandon──→ ABANDONED
 *
 * COMPLETED and ABANDONED are terminal — no outgoing edges.
 */

import { SessionStatus, SessionBlockStatus } from '../../shared/enums.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';
import type { SessionBlock } from '@prisma/client';

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  [SessionStatus.GENERATED]: [SessionStatus.STARTED, SessionStatus.ABANDONED],
  [SessionStatus.STARTED]: [SessionStatus.PAUSED, SessionStatus.COMPLETED, SessionStatus.ABANDONED],
  [SessionStatus.PAUSED]: [SessionStatus.STARTED, SessionStatus.ABANDONED],
  [SessionStatus.COMPLETED]: [],
  [SessionStatus.ABANDONED]: [],
};

export class SessionRuntimeService {
  /**
   * Throws ValidationError if the requested transition is not allowed.
   */
  validateTransition(currentStatus: SessionStatus, targetStatus: SessionStatus): void {
    if (currentStatus === targetStatus) {
      throw new ValidationError(
        `Session is already in ${targetStatus} status — no transition needed.`
      );
    }

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new ValidationError(
        `Cannot transition session from ${currentStatus} to ${targetStatus}. ` +
        `Allowed target(s) from ${currentStatus}: ${(allowed ?? []).join(', ') || '(none — terminal state)'}`
      );
    }
  }

  /**
   * Throws ForbiddenError if an active session exists for this child.
   * Pass the current plan id as `excludePlanId` when checking for a
   * session that is itself active (so it doesn't conflict with itself).
   */
  checkNoActiveSession(
    active: { id: string } | null,
    childId: string,
    excludePlanId?: string
  ): void {
    if (active && active.id !== excludePlanId) {
      throw new ForbiddenError(
        `Child already has an active session (${active.id}). ` +
        'Complete or abandon the current session before starting a new one.'
      );
    }
  }

  /**
   * Returns the first incomplete block (by position order) — the resume
   * cursor. Returns null when every block is completed or skipped.
   */
  getResumePosition(blocks: SessionBlock[]): SessionBlock | null {
    const sorted = [...blocks].sort((a, b) => a.position - b.position);
    return (
      sorted.find(
        (b) =>
          b.status !== SessionBlockStatus.COMPLETED &&
          b.status !== SessionBlockStatus.SKIPPED
      ) ?? null
    );
  }

  /**
   * Throws ForbiddenError when the session's childId does not match
   * the authenticated user's childId.
   */
  assertOwnership(session: { childId: string }, userChildId: string | undefined): void {
    if (!userChildId) {
      throw new ForbiddenError('No active child profile selected.');
    }
    if (session.childId !== userChildId) {
      throw new ForbiddenError('Not authorized for this session.');
    }
  }
}

export const sessionRuntime = new SessionRuntimeService();
