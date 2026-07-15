import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { curriculumApi } from '../api';

const keys = {
  curriculum: ['curriculum'] as const,
  available: ['curriculum', 'available'] as const,
  subject: (id: string) => ['curriculum', 'subject', id] as const,
};

export function useCurriculum() {
  return useQuery({
    queryKey: keys.curriculum,
    queryFn: () => curriculumApi.getCurriculum(),
  });
}

export function useAvailableSkills() {
  return useQuery({
    queryKey: keys.available,
    queryFn: () => curriculumApi.getAvailableSkills(),
  });
}

export function useSubjectCurriculum(subjectId: string) {
  return useQuery({
    queryKey: keys.subject(subjectId),
    queryFn: () => curriculumApi.getSubjectCurriculum(subjectId),
    enabled: !!subjectId,
  });
}

export function useActivateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => curriculumApi.activateSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.curriculum });
      queryClient.invalidateQueries({ queryKey: keys.available });
      queryClient.invalidateQueries({ queryKey: ['curriculum', 'subject'] });
    },
  });
}
