/**
 * Reps done, over the live preview (spec §34 phase 7).
 *
 * The counter kept its rule — hidden entirely for a single-rep activity, since
 * "1/1" tells a child nothing — and its idea: a gold star per rep completed.
 * What changed is that the stars are the shared `StarRating` rather than a
 * private row of Ionicons at their own size and their own gold `#FFD700` (§28),
 * and the whole thing now floats as one opaque light pill instead of white text
 * lying directly on the video, where a pale background washed it out.
 *
 * The pill carries a single spoken label for the pair, so a screen reader says
 * "2 of 3 repetitions done" once instead of reading a count and then three
 * anonymous star images, and it announces politely as the count climbs.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StarRating } from '../../../components/design';
import { colors, radius, shadows, spacing, typography } from '../../../theme';

interface RepetitionCounterProps {
  currentReps: number;
  targetReps: number;
}

export const RepetitionCounter: React.FC<RepetitionCounterProps> = ({
  currentReps,
  targetReps,
}) => {
  // A single-rep activity has nothing to count.
  if (targetReps <= 1) return null;

  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${currentReps} of ${targetReps} repetitions done`}
    >
      <Text style={[typography.presets.caption, styles.count]}>
        {currentReps}/{targetReps} reps
      </Text>
      {/* Capped so ten reps still fit across a 360px screen (§27). */}
      <StarRating value={currentReps} max={Math.min(targetReps, 10)} size={18} style={styles.stars} />
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    /* Opaque, so the reading never depends on what the camera happens to see. */
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadows.md,
  },
  count: {
    color: colors.text,
  },
  stars: {
    /* `StarRating` adds its own vertical margin for in-flow use. */
    marginVertical: 0,
  },
});

export default RepetitionCounter;
