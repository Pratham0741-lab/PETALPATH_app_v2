import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';

interface Milestone {
  level: number;
  label: string;
  reward: string;
  requiredXP: number;
}

interface LevelMilestoneProps {
  milestone: Milestone;
  reached: boolean;
  style?: StyleProp<ViewStyle>;
}

export const LevelMilestone: React.FC<LevelMilestoneProps> = ({
  milestone,
  reached,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View
        style={[styles.iconWrap, reached ? styles.iconReached : styles.iconLocked]}
        accessibilityLabel={reached ? 'Milestone reached' : 'Milestone locked'}
      >
        <Ionicons
          name={reached ? 'checkmark-circle' : 'lock-closed'}
          size={24}
          color={reached ? colors.white : colors.textMuted}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>
          Level {milestone.level} — {milestone.label}
        </Text>
        <Text style={styles.reward}>{milestone.reward}</Text>
        <Text style={styles.xp}>{milestone.requiredXP} XP required</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconReached: {
    backgroundColor: colors.green,
  },
  iconLocked: {
    backgroundColor: colors.border,
  },
  info: {
    marginLeft: spacing.md,
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    color: colors.text,
  },
  reward: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  xp: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
