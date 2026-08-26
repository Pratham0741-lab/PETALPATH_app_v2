/**
 * Badge detail — pushed from the badge gallery grid.
 *
 * Redesign notes (§7, §35): the unused `Ionicons`, `radius` and `shadows`
 * imports are gone, the shell keeps `ScreenContainer` + `TopBar`, and the body is
 * a single `BadgeDetailCard`.
 *
 * The screen used to render a `BadgeCard` grid tile and then, for an unearned
 * badge, a second `LockedBadge` beneath it — the same badge twice at two sizes,
 * with two different medals. One card covers both states now.
 *
 * `showBack` was added to the top bar: this screen is only ever reached by a
 * push, so the sole way out was the hardware button or an edge swipe, neither of
 * which a five-year-old reaches for. The states are wrapped in `StatePanel`
 * because `LoadingSpinner`, `ErrorState` and `EmptyState` all centre themselves
 * with `flex: 1`, which resolves to zero height between a top bar and nothing.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../theme';
import { StatePanel } from '../../../components/design';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { BadgeDetailCard } from '../../../components/gamification/badges/BadgeDetailCard';
import { useBadges } from '../../../hooks/useRewards';

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
  const route = useRoute<BadgeDetailRouteProp>();
  const { badgeId } = route.params;
  const { data, isLoading, isError, error, refetch } = useBadges();

  const badges: Badge[] = data?.data ?? [];
  const badge = badges.find((b) => b.id === badgeId);

  return (
    <ScreenContainer>
      <TopBar title={badge?.name ?? 'Badge'} showBack />
      {isLoading ? (
        <StatePanel bare minHeight={280}>
          <LoadingSpinner label="Loading badge" />
        </StatePanel>
      ) : isError ? (
        <StatePanel bare minHeight={280}>
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load badge'}
            onRetry={refetch}
          />
        </StatePanel>
      ) : !badge ? (
        <StatePanel bare minHeight={280}>
          <EmptyState
            icon="medal"
            title="Badge not found"
            message="This badge is no longer available."
          />
        </StatePanel>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <BadgeDetailCard
            name={badge.name}
            description={badge.description}
            imagePath={badge.imagePath}
            earned={badge.earned}
            earnedAt={badge.earnedAt}
          />
          {badge.earned ? null : (
            <Text style={styles.hint}>Keep learning to unlock this badge!</Text>
          )}
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
  hint: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default BadgeDetailScreen;
