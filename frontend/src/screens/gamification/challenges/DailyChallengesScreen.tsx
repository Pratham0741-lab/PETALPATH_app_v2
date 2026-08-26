/**
 * Daily challenges — reached from the Rewards tab's quick links.
 *
 * Redesign notes (§35): keeps the `ScreenContainer` + `TopBar` shell and the
 * existing `useDailyChallenges`/`useDailyStreak` queries, and drops the unused
 * `Ionicons`/`typography` imports plus a `useNavigation` call whose result was
 * never read.
 *
 * The streak used to be three flames at once: a `FlameAnimation`, `StreakCard`'s
 * own Ionicons flame, and a literal `🔥` inside the headline number. It is one
 * flame now — `StreakCard animated` renders the animation in place of its static
 * icon well, which also removes a card nested inside a card.
 *
 * The `EmptyState` was asking for a `🎯` emoji icon (§7); `ChallengeList` owns
 * the empty case now, so the screen no longer duplicates it. The remaining
 * states are wrapped in `StatePanel` so their `flex: 1` centring has a height to
 * work with inside the scroll view.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { colors, spacing } from '../../../theme';
import { StatePanel } from '../../../components/design';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { useDailyChallenges, useDailyStreak } from '../../../hooks/useRewards';
import { ChallengeHeader } from '../../../components/gamification/challenges/ChallengeHeader';
import { ChallengeList } from '../../../components/gamification/challenges/ChallengeList';
import StreakCard from '../../../components/gamification/streaks/StreakCard';

export const DailyChallengesScreen: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useDailyChallenges();
  const { data: streakData } = useDailyStreak();

  const currentStreak = streakData?.currentStreak ?? 0;
  const challenges = data?.available === true ? (data?.challenges ?? []) : [];

  return (
    <ScreenContainer>
      <TopBar title="Daily Challenges" showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <StatePanel>
            <LoadingSpinner label="Loading challenges" />
          </StatePanel>
        ) : isError ? (
          <StatePanel>
            <ErrorState
              message={error?.message ?? 'Failed to load daily challenges.'}
              onRetry={refetch}
            />
          </StatePanel>
        ) : (
          <>
            <StreakCard
              currentStreak={currentStreak}
              longestStreak={streakData?.longestStreak ?? 0}
              animated
              style={styles.streakCard}
            />

            <ChallengeHeader
              title="Today's Challenges"
              subtitle="Complete challenges to earn rewards!"
            />
            <ChallengeList challenges={challenges} />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  streakCard: {
    marginBottom: spacing.lg,
  },
});

export default DailyChallengesScreen;
