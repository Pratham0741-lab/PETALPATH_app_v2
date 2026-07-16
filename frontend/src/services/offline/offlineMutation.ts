import { apiClient } from '../api/apiClient';
import { offlineQueue, type OfflineRequestCategory, type OfflineRequestMethod } from './offlineQueue';
import { ApiError } from '../../api/errors';

export interface OfflineMutationOptions {
  method: OfflineRequestMethod;
  url: string;
  body?: unknown;
  category: OfflineRequestCategory;
  /** When true, network failures are queued instead of thrown. Default true. */
  queueOnFailure?: boolean;
}

export interface OfflineMutationResult {
  status: 'success' | 'queued' | 'error';
  error?: string;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return err.isNetworkError;
  return false;
}

/**
 * Fire-and-confirm mutation that degrades gracefully offline.
 *
 * - Online + success → 'success'.
 * - Offline or network error → the request is persisted to the offline queue
 *   and replayed automatically on reconnect ('queued'). The caller should
 *   already have applied an optimistic update via React Query.
 * - Non-network error (4xx/5xx) → 'error' and the error is surfaced to the
 *   caller (these are real validation/business failures, not retryable offline).
 */
export async function runOfflineSafeMutation(
  opts: OfflineMutationOptions,
): Promise<OfflineMutationResult> {
  const queueOnFailure = opts.queueOnFailure ?? true;
  try {
    switch (opts.method) {
      case 'POST':
        await apiClient.post(opts.url, opts.body);
        break;
      case 'PUT':
        await apiClient.put(opts.url, opts.body);
        break;
      case 'PATCH':
        await apiClient.patch(opts.url, opts.body);
        break;
      case 'DELETE':
        await apiClient.delete(opts.url);
        break;
    }
    return { status: 'success' };
  } catch (err) {
    if (queueOnFailure && isNetworkError(err)) {
      await offlineQueue.enqueue({
        method: opts.method,
        url: opts.url,
        body: opts.body,
        category: opts.category,
      });
      return { status: 'queued' };
    }
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}
