import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <ScreenContainer>
      <TopBar title="Achievements" />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Could not load achievements.'}
          onRetry={refetch}
        />
      ) : !data || !data.earned || data.earned.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No achievements yet"
          message="Complete activities to earn achievements!"
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AchievementSummary
            total={data.total}
            completed={data.completedCount}
          />
          <View style={styles.listWrap}>
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
          </View>
        </ScrollView>
      )}
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
  listWrap: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
});
