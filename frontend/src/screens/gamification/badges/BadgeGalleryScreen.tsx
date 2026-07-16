import React from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { BadgeGrid } from '../../../components/gamification/badges/BadgeGrid';
import { BadgeProgress } from '../../../components/gamification/badges/BadgeProgress';
import { useBadges } from '../../../hooks/useRewards';
import { useNavigation } from '@react-navigation/native';

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
  const navigation = useNavigation<any>();
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
      <TopBar title="Badges" />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load badges'}
          onRetry={refetch}
        />
      ) : total === 0 ? (
        <EmptyState message="No badges yet" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <BadgeProgress earnedCount={earnedCount} totalCount={total} />
          {categories.map((category) => (
            <View key={category} style={styles.section}>
              <Text style={styles.sectionHeader}>{category}</Text>
              <BadgeGrid
                badges={grouped[category]}
                onBadgePress={(badgeId: string) =>
                  navigation.navigate('BadgeDetail', { badgeId })
                }
              />
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
