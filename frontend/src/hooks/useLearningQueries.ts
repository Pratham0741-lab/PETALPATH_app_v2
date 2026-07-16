import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useChildStore } from '../store/childStore';
import { learningApi } from '../services/api/learningApi';
import { queryKeys } from '../utils/queryKeys';
import { invalidateQueries } from '../utils/queryHelpers';

function useActiveChildId(): string | null {
  return useChildStore((s) => s.activeChild?.id ?? null);
}

export function useDashboardOverview() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.dashboard.overview(childId ?? 'none'),
    queryFn: () => learningApi.getDashboardOverview(childId!),
    enabled: !!childId,
  });
}

export function useRoadmap() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.roadmap.all(childId ?? 'none'),
    queryFn: () => learningApi.getRoadmap(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lessons.detail(lessonId ?? 'none'),
    queryFn: () => learningApi.getLesson(lessonId!),
    enabled: !!lessonId,
  });
}

export function useActivities(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activities.byLesson(lessonId ?? 'none'),
    queryFn: () => learningApi.getActivities(lessonId!),
    enabled: !!lessonId,
  });
}

export function useProgressOverview() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.progress.overview(childId ?? 'none'),
    queryFn: () => learningApi.getProgressOverview(childId!),
    enabled: !!childId,
  });
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();
  const childId = useActiveChildId();
  return useMutation({
    mutationFn: (lessonId: string) => learningApi.completeLesson(lessonId),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
      }
    },
  });
}

export function useRecommendation() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.recommendations.child(childId ?? 'none'),
    queryFn: () => learningApi.getRecommendation(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRewardsOverview() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.rewards.overview(childId ?? 'none'),
    queryFn: () => learningApi.getRewards(childId!),
    enabled: !!childId,
  });
}

export function useStickers() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.rewards.stickers(childId ?? 'none'),
    queryFn: () => learningApi.getStickers(childId!),
    enabled: !!childId,
  });
}

export function useBadges() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.rewards.badges(childId ?? 'none'),
    queryFn: () => learningApi.getBadges(childId!),
    enabled: !!childId,
  });
}

export function useMastery() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.mastery.child(childId ?? 'none'),
    queryFn: () => learningApi.getMastery(childId!),
    enabled: !!childId,
  });
}

export function useCurriculum() {
  return useQuery({
    queryKey: queryKeys.curriculum.all,
    queryFn: () => learningApi.getCurriculum(),
  });
}
