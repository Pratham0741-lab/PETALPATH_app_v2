import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import { useChildStore } from '../store/childStore';

export function useAnalyticsOverview() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: ['analytics-overview', childId],
    queryFn: () => analyticsApi.getAnalyticsOverview(childId),
    enabled: !!childId,
  });
}

export function useAnalyticsActivity(period: 'daily' | 'weekly' | 'monthly') {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: ['analytics-activity', period, childId],
    queryFn: () => analyticsApi.getAnalyticsActivity(period, childId),
    enabled: !!childId,
  });
}

export function useAnalyticsProgress() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: ['analytics-progress', childId],
    queryFn: () => analyticsApi.getAnalyticsProgress(childId),
    enabled: !!childId,
  });
}

export function useAnalyticsRewards() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: ['analytics-rewards', childId],
    queryFn: () => analyticsApi.getAnalyticsRewards(childId),
    enabled: !!childId,
  });
}

export function useAnalyticsTimeline(page: number) {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: ['analytics-timeline', page, childId],
    queryFn: () => analyticsApi.getAnalyticsTimeline(page, 20, childId),
    enabled: !!childId,
  });
}

export function useAnalyticsSubjects() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: ['analytics-subjects', childId],
    queryFn: () => analyticsApi.getAnalyticsSubjects(),
    enabled: !!childId,
  });
}
