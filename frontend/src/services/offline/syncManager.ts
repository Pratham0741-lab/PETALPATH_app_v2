import { offlineQueue, type QueuedRequest } from './offlineQueue';
import { apiClient } from '../api/apiClient';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

const listeners = new Set<(state: SyncState, pending: number) => void>();
let currentState: SyncState = 'idle';
let currentPending = 0;
let isFlushing = false;

function emit() {
  for (const l of listeners) {
    try {
      l(currentState, currentPending);
    } catch {
      /* listener errors must not break sync */
    }
  }
}

async function recomputePending() {
  const pending = await offlineQueue.getPending();
  currentPending = pending.length;
}

export function subscribeSync(cb: (state: SyncState, pending: number) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSyncState(): { state: SyncState; pending: number } {
  return { state: currentState, pending: currentPending };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process a single queued request by replaying it against the real API.
 * Returns true when it succeeded (or was definitively rejected and should be
 * dropped), false when it should be retried later.
 */
async function processOne(item: QueuedRequest): Promise<boolean> {
  try {
    switch (item.method) {
      case 'POST':
        await apiClient.post(item.url, item.body);
        break;
      case 'PUT':
        await apiClient.put(item.url, item.body);
        break;
      case 'PATCH':
        await apiClient.patch(item.url, item.body);
        break;
      case 'DELETE':
        await apiClient.delete(item.url);
        break;
    }
    await offlineQueue.remove(item.id);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await offlineQueue.markAttempt(item.id, message);
    // If we've exhausted retries, drop it to avoid an infinite loop and
    // surface it as a "failed" item the UI can optionally show.
    if (item.attempts + 1 >= item.maxAttempts) {
      await offlineQueue.remove(item.id);
      return true;
    }
    return false;
  }
}

export async function flushQueue(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;
  currentState = 'syncing';
  await recomputePending();
  emit();

  try {
    const pending = await offlineQueue.getPending();
    for (const item of pending) {
      const ok = await processOne(item);
      await recomputePending();
      emit();
      if (!ok) {
        // back off briefly before the next attempt
        await delay(400 * (item.attempts + 1));
      }
    }
    currentState = currentPending > 0 ? 'error' : 'idle';
  } catch {
    currentState = 'error';
  } finally {
    isFlushing = false;
    await recomputePending();
    emit();
  }
}

/**
 * Mark the device offline. Stops active syncing; the queue is retained and
 * will be flushed when connectivity returns.
 */
export function setOffline(): void {
  currentState = 'offline';
  void recomputePending().then(emit);
}

/**
 * Notify the manager that connectivity was restored so it can flush.
 */
export function setOnline(): void {
  currentState = 'idle';
  void flushQueue();
}

/**
 * Optimistic rollback helper: when an optimistic React Query update must be
 * undone because the underlying request failed (and cannot be queued), callers
 * can use this to invalidate and refetch the affected query keys.
 */
export async function rollbackKeys(
  queryClient: { invalidateQueries: (opts: { queryKey: unknown[] }) => Promise<unknown> },
  keys: unknown[][],
): Promise<void> {
  for (const key of keys) {
    await queryClient.invalidateQueries({ queryKey: key as unknown[] });
  }
}
