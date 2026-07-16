import { useEffect, useState } from 'react';
import {
  subscribeSync,
  getSyncState,
  flushQueue,
  setOnline,
  setOffline,
  type SyncState,
} from '../services/offline/syncManager';
import { useNetworkStatus } from './useNetworkStatus';

export interface OfflineSyncStatus {
  state: SyncState;
  pending: number;
  isSyncing: boolean;
  isOffline: boolean;
  flush: () => void;
}

/**
 * Bridges the global network-status hook with the offline sync manager and
 * exposes the current queue state to React components.
 *
 * - When the device goes offline, the manager pauses syncing and retains the
 *   queue.
 * - When connectivity returns, the manager automatically flushes pending
 *   requests.
 */
export function useOfflineSync(): OfflineSyncStatus {
  const { isOffline } = useNetworkStatus();
  const [snapshot, setSnapshot] = useState<{ state: SyncState; pending: number }>(
    getSyncState(),
  );

  useEffect(() => {
    const unsub = subscribeSync((state, pending) => {
      setSnapshot({ state, pending });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOffline) {
      setOffline();
    } else {
      setOnline();
    }
  }, [isOffline]);

  return {
    state: snapshot.state,
    pending: snapshot.pending,
    isSyncing: snapshot.state === 'syncing',
    isOffline,
    flush: () => {
      void flushQueue();
    },
  };
}
