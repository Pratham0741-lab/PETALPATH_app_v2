import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useChildStore } from '../store/childStore';
import { analyticsApi } from '../services/api/analyticsApi';
import { queryKeys } from '../utils/queryKeys';
import { invalidateQueries } from '../utils/queryHelpers';

function useActiveChildId(): string | null {
  return useChildStore((s) => s.activeChild?.id ?? null);
}

export function useAnalyticsOverview() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.analytics.overview(childId ?? 'none'),
    queryFn: () => analyticsApi.getOverview(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useAnalyticsActivity(period: 'daily' | 'weekly' | 'monthly') {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.analytics.activity(childId ?? 'none', period),
    queryFn: () => analyticsApi.getActivity(childId!, period),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useAnalyticsProgress() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.analytics.progress(childId ?? 'none'),
    queryFn: () => analyticsApi.getProgress(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useAnalyticsRewards() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.analytics.rewards(childId ?? 'none'),
    queryFn: () => analyticsApi.getRewards(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useAnalyticsTimeline(page: number = 1) {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.analytics.timeline(childId ?? 'none', page),
    queryFn: () => analyticsApi.getTimeline(childId!, page),
    enabled: !!childId,
    staleTime: 1000 * 30,
  });
}

export function useAnalyticsSubjects() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.analytics.subjects(childId ?? 'none'),
    queryFn: () => analyticsApi.getSubjects(childId!),
    enabled: !!childId,
  });
}

export function useDashboardSummary() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.parent.dashboard(childId ?? 'none'),
    queryFn: () => analyticsApi.getDashboardSummary(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useCurriculumInsights() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.parent.curriculum(childId ?? 'none'),
    queryFn: () => analyticsApi.getCurriculumInsights(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWeeklyReport() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.parent.weeklyReport(childId ?? 'none'),
    queryFn: () => analyticsApi.getWeeklyReport(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useMonthlyReport() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.parent.monthlyReport(childId ?? 'none'),
    queryFn: () => analyticsApi.getMonthlyReport(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useLearningHistory(page: number = 1) {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.parent.learningHistory(childId ?? 'none', page),
    queryFn: () => analyticsApi.getLearningHistory(childId!, page),
    enabled: !!childId,
    staleTime: 1000 * 30,
  });
}

export function useSkillMasteryDetailed() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.parent.skillMastery(childId ?? 'none'),
    queryFn: () => analyticsApi.getSkillMasteryDetailed(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useLearningTrends() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.analytics.trends(childId ?? 'none'),
    queryFn: () => analyticsApi.getLearningTrends(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useRefreshAnalytics() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();
  return () => {
    if (!childId) return;
    invalidateQueries(queryClient, queryKeys.analytics.overview(childId));
    invalidateQueries(queryClient, queryKeys.analytics.progress(childId));
    invalidateQueries(queryClient, queryKeys.parent.dashboard(childId));
    invalidateQueries(queryClient, queryKeys.parent.curriculum(childId));
    invalidateQueries(queryClient, queryKeys.parent.skillMastery(childId));
  };
}
