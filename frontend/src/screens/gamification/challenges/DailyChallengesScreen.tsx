import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { useDailyChallenges, useDailyStreak } from '../../../hooks/useRewards';
import { ChallengeHeader } from '../../../components/gamification/challenges/ChallengeHeader';
import { ChallengeList } from '../../../components/gamification/challenges/ChallengeList';
import StreakCard from '../../../components/gamification/streaks/StreakCard';
import FlameAnimation from '../../../components/gamification/streaks/FlameAnimation';

export const DailyChallengesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, isError, error, refetch } = useDailyChallenges();
  const { data: streakData } = useDailyStreak();

  const hasChallenges =
    data?.available === true && (data?.challenges?.length ?? 0) > 0;

  return (
    <ScreenContainer>
      <TopBar title="Daily Challenges" showBack />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState
          message={error?.message ?? 'Failed to load daily challenges.'}
          onRetry={refetch}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.streakWrapper}>
            <FlameAnimation active={(streakData?.currentStreak ?? 0) > 0} />
            <StreakCard
              currentStreak={streakData?.currentStreak ?? 0}
              longestStreak={streakData?.longestStreak ?? 0}
            />
          </View>
          <ChallengeHeader
            title="Today's Challenges"
            subtitle="Complete challenges to earn rewards!"
          />
          {hasChallenges ? (
            <ChallengeList challenges={data?.challenges ?? []} />
          ) : (
            <EmptyState
              icon="🎯"
              title="No challenges yet"
              message="Daily challenges will appear here soon. Keep learning!"
            />
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  streakWrapper: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
});
