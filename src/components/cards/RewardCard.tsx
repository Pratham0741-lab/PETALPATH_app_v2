import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';

interface RewardCardProps {
  title: string;
  description: string;
  starValue?: number;
  unlocked: boolean;
  style?: StyleProp<ViewStyle>;
}

export const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  starValue,
  unlocked,
  style,
}) => {
  return (
    <AppCard style={[styles.card, style]} outlined={!unlocked}>
      <View style={styles.container}>
        <View style={[styles.iconBox, { backgroundColor: unlocked ? colors.purple + '20' : colors.background }]}>
          <Ionicons
            name={unlocked ? 'trophy' : 'lock-closed'}
            size={28}
            color={unlocked ? colors.yellow : colors.textMuted}
          />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, !unlocked && styles.lockedText]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {starValue !== undefined && starValue > 0 ? (
          <View style={styles.valueContainer}>
            <Ionicons name="star" size={16} color={colors.yellow} style={styles.starIcon} />
            <Text style={styles.starValue}>{starValue}</Text>
          </View>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  lockedText: {
    color: colors.textMuted,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  starIcon: {
    marginRight: spacing.xs,
  },
  starValue: {
    color: colors.yellow,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
