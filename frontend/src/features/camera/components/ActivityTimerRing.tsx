/**
 * Hold-the-pose timer, over the live preview (spec §34 phase 7).
 *
 * The file was called a ring and drew a 260px-wide bar with `🙌 Hold Pose: 45%`
 * and `✅ Pose Held!` in it — emoji standing in for icons (§7), and a fixed width
 * wider than the padded content area of a 360px phone (§27). It is now the shared
 * `ProgressRing` on a white disc, with a `check` glyph replacing the tick emoji
 * and the caption in a pill beneath it.
 *
 * The maths is untouched: the same clamped `progressMs / targetMs` ratio, the
 * same rounding to whole percent, and the same countdown branch that takes over
 * while the activity is starting (§1).
 *
 * The disc is opaque on purpose. A translucent black bar was unreadable against
 * a bright wall, and this overlay's whole job is to be readable from across the
 * room.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PetalIcon, ProgressRing } from '../../../components/design';
import { colors, radius, shadows, spacing, typography } from '../../../theme';

interface ActivityTimerRingProps {
  progressMs: number;
  targetMs: number;
  countdownSec?: number;
  isStarting?: boolean;
}

const RING_SIZE = 108;

export const ActivityTimerRing: React.FC<ActivityTimerRingProps> = ({
  progressMs,
  targetMs,
  countdownSec = 0,
  isStarting = false,
}) => {
  if (isStarting && countdownSec > 0) {
    return (
      <View
        style={styles.countdown}
        accessible
        accessibilityLiveRegion="assertive"
        accessibilityLabel={`Starting in ${countdownSec}`}
      >
        <Text style={[typography.presets.display, styles.countdownText]}>{countdownSec}</Text>
      </View>
    );
  }

  const ratio = Math.min(1, Math.max(0, progressMs / Math.max(1, targetMs)));
  const pct = Math.round(ratio * 100);
  const held = pct === 100;

  return (
    <View style={styles.wrap}>
      <View style={styles.disc}>
        <ProgressRing
          value={pct}
          size={RING_SIZE}
          stroke={12}
          color={held ? colors.green : colors.leafGreen}
          trackColor={colors.greenSoft}
          accessibilityLabel="Holding the pose"
        >
          {held ? (
            <PetalIcon name="check" size={44} color={colors.green} />
          ) : (
            <Text style={[typography.presets.stat, styles.pctText]}>{pct}%</Text>
          )}
        </ProgressRing>
      </View>

      <View style={styles.caption}>
        {held ? <PetalIcon name="check" size={16} color={colors.green} filled /> : null}
        <Text style={[typography.presets.caption, styles.captionText]}>
          {held ? 'Pose Held!' : 'Hold Pose'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  /* A white disc behind the ring: opaque, so the reading never fights the
     camera image behind it. */
  disc: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.circle,
    ...shadows.md,
  },
  pctText: {
    color: colors.text,
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  captionText: {
    color: colors.text,
  },
  countdown: {
    width: 120,
    height: 120,
    borderRadius: radius.circle,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    ...shadows.md,
  },
  countdownText: {
    color: colors.white,
  },
});

export default ActivityTimerRing;
