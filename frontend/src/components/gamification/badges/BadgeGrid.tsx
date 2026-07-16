import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import { BadgeCard } from './BadgeCard';

interface BadgeItem {
  id: string;
  name: string;
  description?: string | null;
  imagePath?: string | null;
  earned: boolean;
  earnedAt?: string | null;
  progress?: number;
}

interface BadgeGridProps {
  badges: BadgeItem[];
  onBadgePress?: (id: string) => void;
  isLoading?: boolean;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges, onBadgePress, isLoading = false }) => {
  if (isLoading) {
    return <LoadingSpinner label="Loading badges" />;
  }

  if (badges.length === 0) {
    return <EmptyState icon="🏅" title="No badges yet" message="Complete activities to earn your first badge." />;
  }

  return (
    <View style={styles.container}>
      {badges.map((badge) => (
        <View key={badge.id} style={styles.item}>
          <BadgeCard
            name={badge.name}
            description={badge.description}
            imagePath={badge.imagePath}
            earned={badge.earned}
            earnedAt={badge.earnedAt}
            progress={badge.progress}
            onPress={onBadgePress ? () => onBadgePress(badge.id) : undefined}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  item: {
    width: '45%',
    marginBottom: 16,
  },
});
