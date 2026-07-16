import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';

interface AchievementSummaryProps {
  total: number;
  completed: number;
  style?: StyleProp<ViewStyle>;
}

export const AchievementSummary: React.FC<AchievementSummaryProps> = ({ total, completed, style }) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="trophy" size={28} color={colors.yellow} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.count}>{completed} of {total} unlocked</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadows.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flexDirection: 'column',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  count: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
  },
});

export default AchievementSummary;
