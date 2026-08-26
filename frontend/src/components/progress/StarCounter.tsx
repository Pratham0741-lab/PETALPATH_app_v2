/**
 * StarCounter — the child's total star count, shown in the TopBar.
 *
 * Redesign notes (§3, §7, §30): the glyph is the `star` PetalIcon instead of
 * Ionicons, and the number is no longer drawn in `colors.yellow`. Mid yellow on
 * a near-white pill is about 1.7:1, so the one piece of information this
 * component exists to convey was effectively invisible. The star keeps the
 * yellow — it is a filled shape, not text — while the count uses `colors.text`
 * on the yellow tint, which clears 4.5:1.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon } from '../icons';
import { useRewardsStore } from '../../store/rewardsStore';

interface StarCounterProps {
  style?: StyleProp<ViewStyle>;
}

export const StarCounter: React.FC<StarCounterProps> = ({ style }) => {
  const stars = useRewardsStore((state) => state.totalStars);

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${stars} ${stars === 1 ? 'star' : 'stars'} earned`}
    >
      <PetalIcon name="star" size={18} color={colors.accent} filled />
      <Text style={styles.countText} numberOfLines={1}>
        {stars}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.yellowSoft,
  },
  countText: {
    ...typography.presets.cardTitle,
    color: colors.text,
    fontWeight: typography.weights.black,
  },
});

export default StarCounter;
