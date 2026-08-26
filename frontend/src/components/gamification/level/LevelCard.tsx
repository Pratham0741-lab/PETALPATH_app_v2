import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from '../../../components/ui';
import { AppCard } from '../../cards/AppCard';

interface LevelCardProps {
  level: number;
  label?: string;
  progressToNext: number;
  currentXP: number;
  nextLevelXP: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LevelCard: React.FC<LevelCardProps> = ({
  level,
  label,
  progressToNext,
  currentXP,
  nextLevelXP,
  onPress,
  style,
}) => {
  return (
    <AppCard style={style} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.badge} accessibilityLabel={`Level ${level}`}>
          <Text style={styles.badgeText}>Lv {level}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Level {level}</Text>
          {label ? <Text style={styles.label}>{label}</Text> : null}
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          Level {level} → {level + 1}
        </Text>
      </View>
      <ProgressBar progress={progressToNext} color={colors.primary} style={styles.bar} />
      <View style={styles.xpRow}>
        <Text style={styles.xpText}>{currentXP} XP</Text>
        <Text style={styles.xpText}>{nextLevelXP} XP</Text>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  info: {
    marginLeft: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    color: colors.text,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  progressRow: {
    marginTop: spacing.md,
  },
  progressText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
  },
  bar: {
    marginTop: spacing.xs,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  xpText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
  },
});
