import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import XPCard from '../../components/gamification/xp/XPCard';
import { CoinCard } from '../../components/gamification/coins/CoinCard';
import { LevelCard } from '../../components/gamification/level/LevelCard';
import { BadgeProgress } from '../../components/gamification/badges/BadgeProgress';
import StreakCard from '../../components/gamification/streaks/StreakCard';
import FlameAnimation from '../../components/gamification/streaks/FlameAnimation';
import { ChallengeHeader } from '../../components/gamification/challenges/ChallengeHeader';
import AchievementSummary from '../../components/gamification/achievements/AchievementSummary';
import { LEVEL_MILESTONES } from '../../services/gamification/derivations';
import {
  useXP,
  useCoins,
  useBadges,
  useDailyStreak,
  useDailyChallenges,
  useRewardHistory,
  useRefreshRewards,
} from '../../hooks/useRewards';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius, shadows } from '../../theme';

interface DashboardBadge {
  id: string;
  name: string;
  description?: string | null;
  imagePath?: string;
  earned: boolean;
  earnedAt?: string | null;
  iconKey?: string | null;
  category?: string | null;
}

interface RewardHistoryItem {
  id: string;
  type: string;
  label: string;
  date: string;
  iconKey?: string | null;
}

export const RewardsDashboardScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const xp = useXP();
  const coins = useCoins();
  const badges = useBadges();
  const streak = useDailyStreak();
  const challenges = useDailyChallenges();
  const history = useRewardHistory();
  const refresh = useRefreshRewards();
  const [refreshing, setRefreshing] = useState(false);

  const earnedBadgeCount = (badges.data?.data as DashboardBadge[] | undefined)?.filter((b) => b.earned).length ?? 0;
  const totalBadgeCount = (badges.data?.data as DashboardBadge[] | undefined)?.length ?? 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (xp.isLoading || coins.isLoading) {
    return (
      <ScreenContainer>
        <TopBar title="Rewards" />
        <LoadingSpinner label="Loading rewards..." />
      </ScreenContainer>
    );
  }

  if (xp.isError || coins.isError) {
    return (
      <ScreenContainer>
        <TopBar title="Rewards" />
        <ErrorState
          title="Couldn't load rewards"
          message="Please try again."
          onRetry={refresh}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TopBar title="Rewards" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.sectionHeader}>Progress</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressHalf}>
            <XPCard
              xp={xp.data?.xp ?? 0}
              level={xp.data?.level ?? 1}
              progressToNext={xp.data?.progressToNext ?? 0}
              nextLevelXP={xp.data?.nextLevelXP ?? 100}
            />
          </View>
          <View style={styles.progressHalf}>
            <CoinCard balance={coins.data ?? 0} />
          </View>
        </View>

        <Text style={styles.sectionHeader}>Level</Text>
        <LevelCard
          level={xp.data?.level ?? 1}
          label={LEVEL_MILESTONES.find((m: { level: number }) => m.level === xp.data?.level)?.label}
          progressToNext={xp.data?.progressToNext ?? 0}
          currentXP={xp.data?.xpForCurrentLevel ?? 0}
          nextLevelXP={xp.data?.nextLevelXP ?? 100}
        />

        <Text style={styles.sectionHeader}>Badges</Text>
        <BadgeProgress earnedCount={earnedBadgeCount} totalCount={totalBadgeCount} />
        <Pressable
          style={styles.linkRow}
          onPress={() => navigation.navigate('BadgeGallery')}
        >
          <Text style={styles.linkText}>View all badges</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>

        <Text style={styles.sectionHeader}>Achievements</Text>
        <AchievementSummary
          total={history.data?.length ?? 0}
          completed={earnedBadgeCount}
        />
        <Pressable
          style={styles.linkRow}
          onPress={() => navigation.navigate('Achievements')}
        >
          <Text style={styles.linkText}>View achievements</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>

        <Text style={styles.sectionHeader}>Daily Streak</Text>
        <View style={styles.streakWrap}>
          <FlameAnimation active={(streak.data?.currentStreak ?? 0) > 0} size={48} />
          <StreakCard
            currentStreak={streak.data?.currentStreak ?? 0}
            longestStreak={streak.data?.longestStreak ?? 0}
          />
        </View>

        <Text style={styles.sectionHeader}>Challenges</Text>
        <ChallengeHeader title="Daily Challenges" />
        {challenges.data?.available && (challenges.data?.challenges?.length ?? 0) > 0 ? (
          <View style={styles.challengeList}>
            {challenges.data.challenges.map((c: { id: string; title: string }, i: number) => (
              <View key={c.id} style={styles.challengeItem}>
                <Ionicons name="flag" size={20} color={colors.orange} />
                <Text style={styles.challengeTitle}>{c.title}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState icon="🎯" title="No challenges yet" message="Check back soon for daily challenges!" />
        )}
        <Pressable
          style={styles.linkRow}
          onPress={() => navigation.navigate('DailyChallenges')}
        >
          <Text style={styles.linkText}>View challenges</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>

        <Text style={styles.sectionHeader}>Reward History</Text>
        {history.data && history.data.length > 0 ? (
          <View style={styles.historyCard}>
            {(history.data as RewardHistoryItem[] | undefined)?.map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Ionicons name="medal" size={20} color={colors.primary} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyLabel}>{h.label}</Text>
                  <Text style={styles.historyDate}>{h.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState icon="📜" title="No history yet" message="Earned rewards will show up here." />
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },
  sectionHeader: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  progressHalf: {
    flex: 1,
  },
  streakWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  linkText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    fontFamily: typography.families.rounded,
  },
  challengeList: {
    gap: spacing.sm,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadows.sm,
  },
  challengeTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
    fontFamily: typography.families.rounded,
    /* Challenge titles are full sentences ("Finish three activities today") and
       sit beside a flag icon in a row, so they have to be allowed to wrap. */
    flexShrink: 1,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadows.md,
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  historyLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  historyDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginTop: 2,
  },
});

export default RewardsDashboardScreen;
