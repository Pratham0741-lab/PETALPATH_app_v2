import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storiesApi } from '../api';

const storyKeys = {
  all: ['stories'] as const,
  list: (params?: Record<string, unknown>) => ['stories', 'list', params] as const,
  detail: (id: string) => ['story', id] as const,
  progress: (id: string) => ['story-progress', id] as const,
};

export function useStories(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: storyKeys.list(params),
    queryFn: () => storiesApi.getStories(params),
  });
}

export function useStory(id: string) {
  return useQuery({
    queryKey: storyKeys.detail(id),
    queryFn: () => storiesApi.getStory(id),
    enabled: !!id,
  });
}

export function useStoryProgress(storyId: string) {
  return useQuery({
    queryKey: storyKeys.progress(storyId),
    queryFn: () => storiesApi.getStoryProgress(storyId),
    enabled: !!storyId,
  });
}

export function useStartStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => storiesApi.startStory(storyId),
    onSuccess: (_data, storyId) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.progress(storyId) });
    },
  });
}

export function useUpdateStoryPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, pageNumber, readingTime }: { storyId: string; pageNumber: number; readingTime?: number }) =>
      storiesApi.updateStoryPage(storyId, pageNumber, readingTime),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.progress(variables.storyId) });
    },
  });
}

export function useCompleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, readingTime }: { storyId: string; readingTime: number }) =>
      storiesApi.completeStory(storyId, readingTime),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.progress(variables.storyId) });
      queryClient.invalidateQueries({ queryKey: storyKeys.detail(variables.storyId) });
      queryClient.invalidateQueries({ queryKey: storyKeys.all });
    },
  });
}
