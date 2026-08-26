import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from '../../cards/AppCard';

interface LevelRewardCardProps {
  level: number;
  label: string;
  reward: string;
  unlocked: boolean;
  style?: StyleProp<ViewStyle>;
}

export const LevelRewardCard: React.FC<LevelRewardCardProps> = ({
  level,
  label,
  reward,
  unlocked,
  style,
}) => {
  return (
    <AppCard style={style}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="gift" size={28} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>
            Level {level}: {label}
          </Text>
          <Text style={styles.reward}>{reward}</Text>
        </View>
        <View style={[styles.badge, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
          <Text style={[styles.badgeText, unlocked ? styles.badgeTextUnlocked : styles.badgeTextLocked]}>
            {unlocked ? 'Unlocked' : 'Locked'}
          </Text>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    color: colors.text,
  },
  reward: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  badgeUnlocked: {
    backgroundColor: colors.green,
  },
  badgeLocked: {
    backgroundColor: colors.border,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  badgeTextUnlocked: {
    color: colors.white,
  },
  badgeTextLocked: {
    color: colors.textMuted,
  },
});
