import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useRewardsStore } from '../../store/rewardsStore';

interface StarCounterProps {
  style?: ViewStyle;
}

export const StarCounter: React.FC<StarCounterProps> = ({ style }) => {
  const stars = useRewardsStore((state) => state.totalStars);

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="star" size={20} color={colors.yellow} style={styles.starIcon} />
      <Text style={styles.countText}>{stars}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  starIcon: {
    marginRight: spacing.xs,
  },
  countText: {
    color: colors.yellow,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
  },
});
