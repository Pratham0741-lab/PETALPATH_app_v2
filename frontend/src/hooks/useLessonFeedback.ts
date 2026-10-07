import { useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { runOfflineSafeMutation } from '../services/offline/offlineMutation';
import { flushQueue } from '../services/offline/syncManager';
import { ApiError } from '../api/errors';

/** Stored codes for the quick-reason chips. Must match the backend validator. */
export type FeedbackReason = 'TOO_EASY' | 'TOO_HARD' | 'TOO_LONG' | 'LOST_INTEREST' | 'LOVED_IT';

export const FEEDBACK_COMMENT_MAX = 1000;

export interface LessonFeedbackPayload {
  rating: number;
  /** Omit to leave whatever the server already has. */
  reasons?: FeedbackReason[];
  comment?: string | null;
}

/** `queued` = no connection; saved on the device and sent on reconnect. */
export type LessonFeedbackOutcome = 'sent' | 'queued';

const APP_VERSION = Constants.expoConfig?.version ?? 'unknown';

/**
 * RFC 4122 v4. Only an idempotency key — the server checks ownership — so
 * `Math.random` is enough and avoids a native crypto dependency.
 */
function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** 429 and 5xx are worth another try; other 4xx are real rejections. */
function isTransient(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 429 || error.statusCode >= 500);
}

/**
 * Grown-up feedback for one finished lesson.
 *
 * Every call targets the same feedback row (one client-generated id per hook
 * instance), so the immediate star rating and the optional reasons/comment that
 * follow update one record rather than creating two.
 *
 * - Offline / unreachable: the request goes to the persistent offline queue and
 *   resolves as `queued`; `syncManager` replays it on reconnect. The same id
 *   makes a replay an update, never a duplicate.
 * - 429 / 5xx: retried by TanStack with backoff.
 * - Other 4xx: surfaced as an error.
 *
 * Calls share a mutation scope, so a quick "Send" can never overtake the rating
 * request it follows.
 */
export function useLessonFeedback(lessonId: string | null | undefined, childId: string | null | undefined) {
  const feedbackId = useMemo(uuidV4, [lessonId]);

  // Opportunistically drain feedback queued after an earlier lesson. Native has
  // no connectivity events here, so otherwise it waits for the next app start.
  useEffect(() => {
    void flushQueue();
  }, []);

  return useMutation<LessonFeedbackOutcome, Error, LessonFeedbackPayload>({
    scope: { id: `lesson-feedback:${feedbackId}` },
    mutationFn: async (payload) => {
      if (!lessonId || !childId) throw new Error('No lesson or child to rate');
      const result = await runOfflineSafeMutation({
        method: 'POST',
        url: '/feedback',
        body: { id: feedbackId, lessonId, childId, appVersion: APP_VERSION, ...payload },
        category: 'lesson-feedback',
      });
      if (result.status === 'error') throw result.cause ?? new Error(result.error);
      return result.status === 'queued' ? 'queued' : 'sent';
    },
    retry: (failureCount, error) => failureCount < 3 && isTransient(error),
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
