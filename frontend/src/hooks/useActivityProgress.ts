import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChildStore } from '../store/childStore';
import { activityApi } from '../services/api/activityApi';
import { learningApi } from '../services/api/learningApi';
import { queryKeys } from '../utils/queryKeys';
import { invalidateQueries } from '../utils/queryHelpers';
import { runOfflineSafeMutation } from '../services/offline/offlineMutation';

function useActiveChildId(): string | null {
  return useChildStore((s) => s.activeChild?.id ?? null);
}

export function useVideoProgress() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();
  const invalidateAll = () => {
    if (!childId) return;
    invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
    invalidateQueries(queryClient, queryKeys.progress.overview(childId));
    invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
    invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
    invalidateQueries(queryClient, queryKeys.mastery.child(childId));
  };

  const saveProgress = useMutation({
    mutationFn: ({ videoId, watchPosition }: { videoId: string; watchPosition: number }) =>
      activityApi.saveVideoProgress(videoId, watchPosition),
  });

  const complete = useMutation({
    mutationFn: async (videoId: string) => {
      const result = await runOfflineSafeMutation({
        method: 'POST',
        url: '/video-progress/complete',
        body: { videoId },
        category: 'video-progress',
      });
      if (result.status === 'error') {
        throw new Error(result.error ?? 'Failed to complete video');
      }
      return result;
    },
    onSuccess: invalidateAll,
  });

  return { saveProgress, complete };
}

export function useListenProgress() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();

  const complete = useMutation({
    mutationFn: (activityId: string) => activityApi.completeListen(activityId),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
      }
    },
  });

  return { complete };
}

export function useSpeakProgress() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();

  const complete = useMutation({
    mutationFn: ({ activityId, score }: { activityId: string; score?: number }) =>
      activityApi.completeSpeak(activityId, score),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
      }
    },
  });

  return { complete };
}

export function useWriteProgress() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();

  const complete = useMutation({
    mutationFn: ({ activityId, score }: { activityId: string; score?: number }) =>
      activityApi.completeWrite(activityId, score),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
      }
    },
  });

  return { complete };
}

export function useSubmitQuiz() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, answers }: { activityId: string; answers: Array<{ questionId: string; answer: string }> }) =>
      activityApi.submitQuiz(activityId, answers),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
        invalidateQueries(queryClient, queryKeys.mastery.child(childId));
      }
    },
  });
}

export function useSubmitGameScore() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, score }: { activityId: string; score: number }) =>
      activityApi.submitGameScore(activityId, score),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
      }
    },
  });
}

export function useCompleteReading() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const result = await runOfflineSafeMutation({
        method: 'POST',
        url: `/activities/${activityId}/reading/complete`,
        body: { activityId },
        category: 'reading-completion',
      });
      if (result.status === 'error') {
        throw new Error(result.error ?? 'Failed to complete reading');
      }
      return result;
    },
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
      }
    },
  });
}

export function useCompleteLessonSync() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const result = await runOfflineSafeMutation({
        method: 'POST',
        url: '/progress/complete',
        body: { lessonId },
        category: 'lesson-progress',
      });
      if (result.status === 'error') {
        throw new Error(result.error ?? 'Failed to complete lesson');
      }
      return result;
    },
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.rewards.overview(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, queryKeys.mastery.child(childId));
      }
    },
  });
}
