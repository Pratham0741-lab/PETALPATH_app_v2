import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useChildStore } from '../store/childStore';
import { intelligenceApi } from '../services/api/intelligenceApi';
import { queryKeys } from '../utils/queryKeys';
import { invalidateQueries } from '../utils/queryHelpers';

function useActiveChildId(): string | null {
  return useChildStore((s) => s.activeChild?.id ?? null);
}

// --- AI Tutor ---

export function useAITutorSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['ai-tutor', 'session', sessionId],
    queryFn: () => intelligenceApi.getAITutorSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 30,
  });
}

export function useAITutorSessions() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['ai-tutor', 'sessions', childId],
    queryFn: () => intelligenceApi.getAITutorSessions(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useSendAITutorMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      intelligenceApi.sendAITutorMessage(sessionId, message),
    onSuccess: (_, variables) => {
      invalidateQueries(queryClient, ['ai-tutor', 'session', variables.sessionId]);
    },
  });
}

export function useCompleteAITutorSession() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => intelligenceApi.completeAITutorSession(sessionId),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.mastery.child(childId));
        invalidateQueries(queryClient, queryKeys.recommendations.child(childId));
        invalidateQueries(queryClient, queryKeys.dashboard.overview(childId));
        invalidateQueries(queryClient, ['ai-tutor', 'sessions', childId]);
      }
    },
  });
}

export function useCreateAITutorSession() {
  const queryClient = useQueryClient();
  const childId = useActiveChildId();
  return useMutation({
    mutationFn: (topic: string) => intelligenceApi.createAITutorSession(topic),
    onSuccess: () => {
      if (childId) {
        invalidateQueries(queryClient, ['ai-tutor', 'sessions', childId]);
      }
    },
  });
}

// --- Adaptive Profile ---

export function useAdaptiveProfile() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['adaptive', 'profile', childId],
    queryFn: () => intelligenceApi.getAdaptiveProfile(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useModalityPerformance() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['adaptive', 'modality', childId],
    queryFn: () => intelligenceApi.getModalityPerformance(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60 * 5,
  });
}

// --- Adaptive Recommendations ---

export function useAdaptiveRecommendations() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.recommendations.adaptive(childId ?? 'none'),
    queryFn: () => intelligenceApi.getAdaptiveRecommendations(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60 * 2,
  });
}

// --- Reinforcement ---

export function useReinforcementQueue() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.recommendations.reinforcement(childId ?? 'none'),
    queryFn: () => intelligenceApi.getReinforcementQueue(childId!),
    enabled: !!childId,
    staleTime: 1000 * 30,
  });
}

export function useReinforcementDue() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['reinforcement', 'due', childId],
    queryFn: () => intelligenceApi.getReinforcementDue(childId!),
    enabled: !!childId,
  });
}

export function useReinforcementHistory() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['reinforcement', 'history', childId],
    queryFn: () => intelligenceApi.getReinforcementHistory(childId!),
    enabled: !!childId,
  });
}

export function useReinforcementActions() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();
  const invalidateAll = () => {
    if (!childId) return;
    invalidateQueries(queryClient, queryKeys.recommendations.reinforcement(childId));
    invalidateQueries(queryClient, ['reinforcement', 'due', childId]);
    invalidateQueries(queryClient, ['reinforcement', 'history', childId]);
    invalidateQueries(queryClient, queryKeys.mastery.child(childId));
    invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
  };

  const start = useMutation({
    mutationFn: (itemId: string) => intelligenceApi.startReinforcement(itemId),
    onSuccess: invalidateAll,
  });

  const skip = useMutation({
    mutationFn: (itemId: string) => intelligenceApi.skipReinforcement(itemId),
    onSuccess: invalidateAll,
  });

  const complete = useMutation({
    mutationFn: (itemId: string) => intelligenceApi.completeReinforcement(itemId),
    onSuccess: invalidateAll,
  });

  return { start, skip, complete };
}

// --- Mastery ---

export function useMasteryDetail() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: queryKeys.mastery.child(childId ?? 'none'),
    queryFn: () => intelligenceApi.getMasteryDetail(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useWeakSkills() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['mastery', 'weak-skills', childId],
    queryFn: () => intelligenceApi.getWeakSkills(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useSkillMastery(skillId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mastery.skill(skillId ?? 'none', skillId ?? 'none'),
    queryFn: () => intelligenceApi.getSkillMastery(skillId!),
    enabled: !!skillId,
  });
}

// --- Sessions ---

export function useTodaySessions() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['sessions', 'today', childId],
    queryFn: () => intelligenceApi.getTodaySessions(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useSessionHistory() {
  const childId = useActiveChildId();
  return useQuery({
    queryKey: ['sessions', 'history', childId],
    queryFn: () => intelligenceApi.getSessionHistory(childId!),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => intelligenceApi.getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 15,
  });
}

export function useSessionActions() {
  const childId = useActiveChildId();
  const queryClient = useQueryClient();
  const invalidateAll = () => {
    if (!childId) return;
    invalidateQueries(queryClient, ['sessions', 'today', childId]);
    invalidateQueries(queryClient, ['sessions', 'history', childId]);
  };

  const start = useMutation({
    mutationFn: (sessionId: string) => intelligenceApi.startSession(sessionId),
    onSuccess: invalidateAll,
  });

  const pause = useMutation({
    mutationFn: (sessionId: string) => intelligenceApi.pauseSession(sessionId),
    onSuccess: invalidateAll,
  });

  const resume = useMutation({
    mutationFn: (sessionId: string) => intelligenceApi.resumeSession(sessionId),
    onSuccess: invalidateAll,
  });

  const complete = useMutation({
    mutationFn: (sessionId: string) => intelligenceApi.completeSession(sessionId),
    onSuccess: () => {
      if (childId) {
        invalidateAll();
        invalidateQueries(queryClient, queryKeys.roadmap.all(childId));
        invalidateQueries(queryClient, queryKeys.progress.overview(childId));
        invalidateQueries(queryClient, queryKeys.mastery.child(childId));
        invalidateQueries(queryClient, queryKeys.recommendations.child(childId));
      }
    },
  });

  const completeBlock = useMutation({
    mutationFn: ({ sessionId, blockId }: { sessionId: string; blockId: string }) =>
      intelligenceApi.completeSessionBlock(sessionId, blockId),
  });

  const skipBlock = useMutation({
    mutationFn: ({ sessionId, blockId }: { sessionId: string; blockId: string }) =>
      intelligenceApi.skipSessionBlock(sessionId, blockId),
  });

  return { start, pause, resume, complete, completeBlock, skipBlock };
}
