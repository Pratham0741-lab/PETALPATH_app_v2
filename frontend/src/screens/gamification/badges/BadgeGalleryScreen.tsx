/**
 * Badge gallery — reached from the Rewards tab's quick links.
 *
 * Redesign notes (§35): keeps the `ScreenContainer` + `TopBar` shell and the
 * category grouping, drops the unused `Ionicons` and `radius`/`shadows` imports,
 * and moves the section headings and states onto the design system.
 *
 * `showBack` was added to the top bar. The screen is pushed onto the stack from
 * Rewards, so there was previously no on-screen way back — only the hardware
 * button or an edge swipe, neither of which a five-year-old reaches for.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../theme';
import { StatePanel } from '../../../components/design';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { BadgeGrid } from '../../../components/gamification/badges/BadgeGrid';
import { BadgeProgress } from '../../../components/gamification/badges/BadgeProgress';
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

export const BadgeGalleryScreen: React.FC = () => {
  const navigation = useNavigation<{
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  }>();
  const { data, isLoading, isError, error, refetch } = useBadges();

  const badges: Badge[] = data?.data ?? [];
  const earnedCount = badges.filter((b) => b.earned).length;
  const total = badges.length;

  const grouped: Record<string, Badge[]> = {};
  for (const badge of badges) {
    const category = badge.category ?? 'General';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(badge);
  }

  const categories = Object.keys(grouped);

  return (
    <ScreenContainer>
      <TopBar title="Badges" showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <StatePanel>
            <LoadingSpinner label="Loading badges" />
          </StatePanel>
        ) : isError ? (
          <StatePanel>
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load badges'}
              onRetry={refetch}
            />
          </StatePanel>
        ) : total === 0 ? (
          <StatePanel>
            <EmptyState
              icon="medal"
              title="No badges yet"
              message="Complete activities to earn your first badge."
            />
          </StatePanel>
        ) : (
          <>
            <BadgeProgress
              earnedCount={earnedCount}
              totalCount={total}
              style={styles.progress}
            />
            {categories.map((category) => (
              <View key={category} style={styles.section}>
                <Text style={styles.sectionHeader} accessibilityRole="header">
                  {category}
                </Text>
                <BadgeGrid
                  badges={grouped[category]}
                  onBadgePress={(badgeId: string) =>
                    navigation.navigate('BadgeDetail', { badgeId })
                  }
                />
              </View>
            ))}
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
  progress: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    ...typography.presets.section,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});

export default BadgeGalleryScreen;
