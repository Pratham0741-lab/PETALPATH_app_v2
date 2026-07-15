import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '../api';
import { useChildStore } from '../store/childStore';

const assessmentKeys = {
  all: ['assessments'] as const,
  detail: (id: string) => ['assessment', id] as const,
  attempts: (childId: string) => ['attempts', childId] as const,
  attempt: (childId: string, attemptId: string) => ['attempt', childId, attemptId] as const,
};

export function useAssessmentsList() {
  const childId = useChildStore((s) => s.activeChild?.id);

  const assessments = useQuery({
    queryKey: [...assessmentKeys.all, childId],
    queryFn: assessmentsApi.getAssessments,
    enabled: !!childId,
  });

  const attempts = useQuery({
    queryKey: assessmentKeys.attempts(childId!),
    queryFn: () => assessmentsApi.getAttempts(childId!),
    enabled: !!childId,
  });

  return { assessments, attempts, childId };
}

export function useAssessmentDetail(id: string) {
  return useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: () => assessmentsApi.getAssessment(id),
    enabled: !!id,
  });
}

export function useAttemptDetail(attemptId: string) {
  const childId = useChildStore((s) => s.activeChild?.id);

  return useQuery({
    queryKey: assessmentKeys.attempt(childId!, attemptId),
    queryFn: () => assessmentsApi.getAttempt(childId!, attemptId),
    enabled: !!childId && !!attemptId,
  });
}

export function useCreateAttempt() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);

  return useMutation({
    mutationFn: (assessmentId: string) =>
      assessmentsApi.createAttempt(childId!, assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.attempts(childId!) });
    },
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);

  return useMutation({
    mutationFn: ({
      attemptId,
      responses,
    }: {
      attemptId: string;
      responses: Array<{ questionId: string; answer: string }>;
    }) => assessmentsApi.submitAttempt(childId!, attemptId, responses),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.attempts(childId!) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.attempt(childId!, variables.attemptId) });
    },
  });
}
