import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const StreakCard: React.FC<StreakCardProps> = ({
  currentStreak,
  longestStreak,
  onPress,
  style,
}) => {
  return (
    <AppCard onPress={onPress} style={[styles.card, style]}>
      <View style={styles.left}>
        <Ionicons name="flame" size={32} color={colors.warning} />
        <View style={styles.textWrap}>
          <Text style={styles.number}>🔥 {currentStreak}</Text>
          <Text style={styles.label}>day streak</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.bestLabel}>Best</Text>
        <Text style={styles.bestValue}>{longestStreak}</Text>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textWrap: {
    marginLeft: spacing.sm,
  },
  number: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
  },
  bestLabel: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
  },
  bestValue: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.orange,
  },
});

export default StreakCard;
