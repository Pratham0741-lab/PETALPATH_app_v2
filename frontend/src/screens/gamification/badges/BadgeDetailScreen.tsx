import React from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { BadgeCard } from '../../../components/gamification/badges/BadgeCard';
import { LockedBadge } from '../../../components/gamification/badges/LockedBadge';
import { useBadges } from '../../../hooks/useRewards';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

interface Badge {
  id: string;
  name: string;
  description: string | null;
  imagePath: string;
  earned: boolean;
  earnedAt?: string | null;
  iconKey?: string | null;
  category?: string | null;
}

type BadgeDetailRouteProp = RouteProp<{ BadgeDetail: { badgeId: string } }, 'BadgeDetail'>;

export const BadgeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<BadgeDetailRouteProp>();
  const { badgeId } = route.params;
  const { data, isLoading, isError, error, refetch } = useBadges();

  const badges: Badge[] = data?.data ?? [];
  const badge = badges.find((b) => b.id === badgeId);

  return (
    <ScreenContainer>
      <TopBar title={badge?.name ?? 'Badge'} />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load badge'}
          onRetry={refetch}
        />
      ) : !badge ? (
        <EmptyState message="Badge not found" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cardWrap}>
            <BadgeCard
              name={badge.name}
              description={badge.description}
              imagePath={badge.imagePath}
              earned={badge.earned}
              earnedAt={badge.earnedAt}
            />
          </View>
          {badge.earned ? (
            <Text style={styles.earnedText}>
              Earned on {new Date(badge.earnedAt ?? '').toLocaleDateString()}
            </Text>
          ) : (
            <View style={styles.lockedWrap}>
              <LockedBadge
                name={badge.name}
                description={badge.description}
                imagePath={badge.imagePath}
              />
              <Text style={styles.hint}>Keep learning to unlock this badge!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cardWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  earnedText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.success,
    marginTop: spacing.md,
  },
  lockedWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  hint: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
