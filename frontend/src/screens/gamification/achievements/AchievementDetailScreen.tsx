import React from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { useAchievements } from '../../../hooks/useRewards';
import AchievementCard from '../../../components/gamification/achievements/AchievementCard';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

type AchievementDetailRouteParams = {
  AchievementDetail: {
    achievementId: string;
  };
};

export const AchievementDetailScreen: React.FC = () => {
  const navigation: any = useNavigation();
  const route = useRoute<RouteProp<AchievementDetailRouteParams, 'AchievementDetail'>>();
  const { achievementId } = route.params;
  const { data, isLoading, isError, error, refetch } = useAchievements();

  const achievement = data?.earned.find((item) => item.id === achievementId);

  return (
    <ScreenContainer>
      <TopBar title="Achievement" showBack />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Could not load achievement.'}
          onRetry={refetch}
        />
      ) : !data || !achievement ? (
        <EmptyState
          icon="trophy-outline"
          title="Achievement not found"
          message="Complete activities to earn achievements!"
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrap}>
            <AchievementCard
              name={achievement.name}
              description={achievement.description}
              progress={achievement.progress}
              target={achievement.target}
              completed={achievement.completed}
              category={achievement.category}
            />
          </View>
          <View style={styles.details}>
            <Text style={styles.label}>Category: {achievement.category ?? 'General'}</Text>
            {achievement.completed ? (
              <View style={styles.completedRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.completedText}>Completed!</Text>
              </View>
            ) : (
              <Text style={styles.progressText}>
                {achievement.progress}/{achievement.target} progress
              </Text>
            )}
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
  cardWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  details: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  completedText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.success,
    marginLeft: spacing.xs,
  },
  progressText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
});
