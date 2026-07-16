import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { ProgressBar } from '../../../components/ui';

interface AchievementProgressProps {
  completedCount: number;
  totalCount: number;
  style?: StyleProp<ViewStyle>;
}

const AchievementProgress: React.FC<AchievementProgressProps> = ({
  completedCount,
  totalCount,
  style,
}) => {
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Text style={styles.label}>Completed</Text>
        <Text style={styles.count}>
          {completedCount}/{totalCount}
        </Text>
      </View>
      <ProgressBar progress={percent} color={colors.orange} style={styles.bar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  count: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.orange,
  },
  bar: {
    marginTop: spacing.xs,
  },
});

export default AchievementProgress;
