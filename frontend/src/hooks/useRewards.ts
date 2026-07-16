import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rewardsApi } from '../services/api/rewardsApi';
import { deriveXPState } from '../services/gamification/derivations';
import { useChildStore } from '../store/childStore';
import { queryKeys } from '../utils/queryKeys';

export function useRewards() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.overview(childId ?? ''),
    queryFn: () => rewardsApi.getOverview(),
    enabled: !!childId,
  });
}

export function useStickers() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.stickers(childId ?? ''),
    queryFn: () => rewardsApi.getStickers(),
    enabled: !!childId,
  });
}

export function useBadges() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.badges(childId ?? ''),
    queryFn: () => rewardsApi.getBadges(),
    enabled: !!childId,
  });
}

export function useXP() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.xp(childId ?? ''),
    queryFn: async () => {
      const res = await rewardsApi.getOverview();
      const totalStars = res.data?.totalStars ?? 0;
      return deriveXPState(totalStars);
    },
    enabled: !!childId,
    select: (state) => state,
  });
}

export function useCoins() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.coins(childId ?? ''),
    queryFn: async () => {
      const res = await rewardsApi.getOverview();
      return res.data?.totalStars ?? 0;
    },
    enabled: !!childId,
  });
}

export function useAchievements() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.achievements(childId ?? ''),
    queryFn: async () => {
      const res = await rewardsApi.getBadges();
      const badges = res.data ?? [];
      const earned = badges.filter((b) => b.earned);
      const total = badges.length;
      return {
        earned: earned.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description ?? '',
          progress: 1,
          target: 1,
          completed: true,
          category: b.category ?? 'general',
          earnedAt: b.earnedAt ?? null,
        })),
        total,
        completedCount: earned.length,
      };
    },
    enabled: !!childId,
  });
}

export function useDailyChallenges() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.challenges(childId ?? ''),
    queryFn: async () => {
      return { challenges: [], available: false };
    },
    enabled: !!childId,
  });
}

export function useDailyStreak() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.streak(childId ?? ''),
    queryFn: async () => {
      return {
        currentStreak: 0,
        longestStreak: 0,
        weekly: [],
        monthly: [],
        hasData: false,
      };
    },
    enabled: !!childId,
  });
}

export function useRewardHistory() {
  const childId = useChildStore((s) => s.activeChild?.id);
  return useQuery({
    queryKey: queryKeys.rewards.history(childId ?? ''),
    queryFn: async () => {
      const res = await rewardsApi.getBadges();
      const badges = res.data ?? [];
      const history = badges
        .filter((b) => b.earned && b.earnedAt)
        .map((b) => ({
          id: b.id,
          type: 'badge' as const,
          label: b.name,
          date: b.earnedAt as string,
          iconKey: b.iconKey ?? null,
        }));
      return history;
    },
    enabled: !!childId,
  });
}

export function useRefreshRewards() {
  const queryClient = useQueryClient();
  const childId = useChildStore((s) => s.activeChild?.id);
  return () => {
    if (!childId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.rewards.all(childId) });
  };
}
