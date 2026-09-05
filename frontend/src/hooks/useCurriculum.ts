import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { curriculumApi } from '../api';

const keys = {
  curriculum: ['curriculum'] as const,
  garden: ['curriculum', 'garden'] as const,
  story: ['curriculum', 'story'] as const,
  gradeProgress: ['curriculum', 'grade-progress'] as const,
  available: ['curriculum', 'available'] as const,
  subject: (id: string) => ['curriculum', 'subject', id] as const,
};

/**
 * What makes returning to Explore instant is `gcTime`, not `staleTime`.
 *
 * The screen gates its spinner on `isLoading`, which is only true when there is
 * *no* cached data at all. The global 5-minute garbage-collect meant a child who
 * spent a few minutes in a lesson came back to an empty cache and sat through a
 * full-screen load; holding the data for a day means the panorama paints
 * immediately every time.
 *
 * `staleTime` stays short on purpose. The garden shows live progress and nothing
 * invalidates it when an activity is finished, so it must re-check promptly — but
 * that refetch now happens in the background behind already-rendered content
 * (`isFetching`, not `isLoading`), so it costs the child no waiting.
 */
const CURRICULUM_CACHE = {
  staleTime: 1000 * 30,
  gcTime: 1000 * 60 * 60 * 24,
} as const;

export function useCurriculum() {
  return useQuery({
    queryKey: keys.curriculum,
    queryFn: () => curriculumApi.getCurriculum(),
    ...CURRICULUM_CACHE,
  });
}

/**
 * "Your Garden" — the one source the Explore panorama and every subject/bloom
 * drill-in read from, so the same flower shows the same stage everywhere.
 */
export function useGarden() {
  return useQuery({
    queryKey: keys.garden,
    queryFn: () => curriculumApi.getGarden(),
    ...CURRICULUM_CACHE,
  });
}

/**
 * "My Story" — the child's progress as a comic. Same source of truth as the
 * garden (the child's live history), just narrated instead of mapped.
 */
export function useProgressStory() {
  return useQuery({
    queryKey: keys.story,
    queryFn: () => curriculumApi.getProgressStory(),
    ...CURRICULUM_CACHE,
  });
}

/**
 * The parent-locked analysis behind Explore. Kept lazy (`enabled`) so the three
 * charts are only fetched once a grown-up has passed the gate, never for the child.
 */
export function useGradeProgress(enabled: boolean) {
  return useQuery({
    queryKey: keys.gradeProgress,
    queryFn: () => curriculumApi.getGradeProgress(),
    ...CURRICULUM_CACHE,
    enabled,
  });
}

export function useAvailableSkills() {
  return useQuery({
    queryKey: keys.available,
    queryFn: () => curriculumApi.getAvailableSkills(),
    ...CURRICULUM_CACHE,
  });
}

export function useSubjectCurriculum(subjectId: string) {
  return useQuery({
    queryKey: keys.subject(subjectId),
    queryFn: () => curriculumApi.getSubjectCurriculum(subjectId),
    ...CURRICULUM_CACHE,
    enabled: !!subjectId,
  });
}

export function useActivateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => curriculumApi.activateSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.curriculum });
      queryClient.invalidateQueries({ queryKey: keys.garden });
      queryClient.invalidateQueries({ queryKey: keys.available });
      queryClient.invalidateQueries({ queryKey: ['curriculum', 'subject'] });
    },
  });
}
