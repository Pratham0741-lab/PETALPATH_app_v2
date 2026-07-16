import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { BadgeGrid } from './BadgeGrid';

interface BadgeItem {
  id: string;
  name: string;
  description?: string | null;
  imagePath?: string | null;
  earned: boolean;
  earnedAt?: string | null;
  progress?: number;
}

interface BadgeCategorySectionProps {
  title: string;
  badges: BadgeItem[];
  onBadgePress?: (id: string) => void;
}

export const BadgeCategorySection: React.FC<BadgeCategorySectionProps> = ({
  title,
  badges,
  onBadgePress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <BadgeGrid badges={badges} onBadgePress={onBadgePress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.purple,
    paddingLeft: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
});
