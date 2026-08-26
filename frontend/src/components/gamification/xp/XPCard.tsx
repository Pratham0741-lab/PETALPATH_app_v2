import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { ProgressBar } from '../../../components/ui';

interface XPCardProps {
  xp: number;
  level: number;
  progressToNext: number;
  nextLevelXP: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const XPCard: React.FC<XPCardProps> = ({ xp, level, progressToNext, nextLevelXP, onPress, style }) => {
  return (
    <AppCard style={[styles.card, style]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.xpBlock}>
          <View style={styles.xpLabelRow}>
            <Ionicons name="star" size={16} color={colors.primary} />
            <Text style={styles.xpLabel}>XP</Text>
          </View>
          <Text style={styles.xpValue}>{xp}</Text>
        </View>
        <View style={styles.levelBadge} accessibilityRole="text" accessibilityLabel={`Level ${level}`}>
          <Text style={styles.levelBadgeText}>{level}</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Level {level}</Text>
        <Text style={styles.progressTarget}>{nextLevelXP} XP</Text>
      </View>
      <ProgressBar progress={progressToNext} color={colors.primary} />
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  xpBlock: {
    flexDirection: 'column',
  },
  xpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  xpLabel: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  xpValue: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    marginTop: spacing.xs,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  progressTarget: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
});

export default XPCard;
