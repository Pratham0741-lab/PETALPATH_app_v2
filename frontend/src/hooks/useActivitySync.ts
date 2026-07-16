import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChildStore } from '../store/childStore';
import { queryKeys } from '../utils/queryKeys';
import { invalidateQueries } from '../utils/queryHelpers';

export function useActivitySync() {
  const childId = useChildStore((s) => s.activeChild?.id ?? null);
  const queryClient = useQueryClient();
  const lastSyncRef = useRef(0);

  const syncAfterActivity = useCallback(() => {
    if (!childId) return;

    const now = Date.now();
    if (now - lastSyncRef.current < 2000) return;
    lastSyncRef.current = now;

    invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
    invalidateQueries(queryClient, queryKeys.progress.overview(childId));
    invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
    invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
    invalidateQueries(queryClient, queryKeys.mastery.child(childId));
    invalidateQueries(queryClient, queryKeys.recommendations.child(childId));
  }, [childId, queryClient]);

  return { syncAfterActivity };
}
