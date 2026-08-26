import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../theme';

interface XPOverviewRowProps {
  xp: number;
  level: number;
}

const XPOverviewRow: React.FC<XPOverviewRowProps> = ({ xp, level }) => {
  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`XP ${xp}, Level ${level}`}>
      <Ionicons name="star" size={14} color={colors.primary} />
      <Text style={styles.xpText}>XP {xp}</Text>
      <View style={styles.divider} />
      <Text style={styles.levelText}>Lv {level}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  xpText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  levelText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
});

export default XPOverviewRow;
