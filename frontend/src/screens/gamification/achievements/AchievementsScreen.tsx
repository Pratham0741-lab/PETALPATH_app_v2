/**
 * Achievements screen — reached from the Rewards tab's quick links.
 *
 * Redesign notes (§35): the screen keeps its `ScreenContainer` + `TopBar` shell
 * (the container carries the tutorial interaction hook, and the top bar carries
 * the child's star total), but the body is now design-system cards, and the
 * unused `Ionicons`, `radius`, `shadows` and `typography` imports are gone.
 *
 * The `listWrap` box also went. It wrapped the whole list in a second card
 * surface, so every achievement was a card inside a card; the cards carry their
 * own surface. And the loading and error states are wrapped in `StatePanel`,
 * because inside a scroll view their `flex: 1` centring has no height to fill.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { colors, spacing } from '../../../theme';
import { StatePanel } from '../../../components/design';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { useAchievements } from '../../../hooks/useRewards';
import AchievementList from '../../../components/gamification/achievements/AchievementList';
import AchievementSummary from '../../../components/gamification/achievements/AchievementSummary';

export const AchievementsScreen: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useAchievements();

  const isEmpty = !data || !data.earned || data.earned.length === 0;

  return (
    <ScreenContainer>
      <TopBar title="Achievements" showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <StatePanel>
            <LoadingSpinner label="Loading achievements" />
          </StatePanel>
        ) : isError ? (
          <StatePanel>
            <ErrorState
              message={error instanceof Error ? error.message : 'Could not load achievements.'}
              onRetry={refetch}
            />
          </StatePanel>
        ) : isEmpty ? (
          <StatePanel>
            <EmptyState
              icon="trophy"
              title="No achievements yet"
              message="Complete activities to earn achievements!"
            />
          </StatePanel>
        ) : (
          <>
            <AchievementSummary
              total={data.total}
              completed={data.completedCount}
              style={styles.summary}
            />
            <AchievementList
              achievements={data.earned.map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                progress: item.progress,
                target: item.target,
                completed: item.completed,
                category: item.category,
              }))}
            />
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
  summary: {
    marginBottom: spacing.lg,
  },
});

export default AchievementsScreen;
