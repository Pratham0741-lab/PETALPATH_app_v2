import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentApi } from '../services/api/assessmentApi';
import { useChildStore } from '../store/childStore';

const placementKeys = {
  all: ['placement'] as const,
  questionnaire: (ageGroup?: string) => ['placement', 'questionnaire', ageGroup] as const,
  result: (childId: string, attemptId: string) => ['placement', 'result', childId, attemptId] as const,
};

export function usePlacementQuestionnaire(ageGroup?: string, startFromBeginning?: boolean) {
  const childId = useChildStore((s) => s.activeChild?.id);

  return useQuery({
    queryKey: placementKeys.questionnaire(ageGroup),
    queryFn: () => assessmentApi.getPlacementQuestionnaire(ageGroup, startFromBeginning),
    enabled: !!childId,
  });
}

export function useStartPlacement() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);

  return useMutation({
    mutationFn: (assessmentId: string) =>
      assessmentApi.startPlacement(childId!, assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

export function useStartPlacementFromBeginning() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);

  return useMutation({
    mutationFn: () => assessmentApi.startPlacementFromBeginning(childId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

export function useSubmitPlacementAnswer() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);

  return useMutation({
    mutationFn: ({
      attemptId,
      questionId,
      answer,
    }: {
      attemptId: string;
      questionId: string;
      answer: string;
    }) => assessmentApi.submitPlacementAnswer(childId!, attemptId, questionId, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

export function useCompletePlacement() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);

  return useMutation({
    mutationFn: (attemptId: string) =>
      assessmentApi.completePlacement(childId!, attemptId),
    onSuccess: (_data, attemptId) => {
      queryClient.invalidateQueries({ queryKey: placementKeys.all });
      queryClient.invalidateQueries({ queryKey: placementKeys.result(childId!, attemptId) });
    },
  });
}

export function usePlacementResult(attemptId: string) {
  const childId = useChildStore((s) => s.activeChild?.id);

  return useQuery({
    queryKey: placementKeys.result(childId!, attemptId),
    queryFn: () => assessmentApi.getPlacementResult(childId!, attemptId),
    enabled: !!childId && !!attemptId,
  });
}

export function useRestartPlacement() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);

  return useMutation({
    mutationFn: () => assessmentApi.restartPlacement(childId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}
