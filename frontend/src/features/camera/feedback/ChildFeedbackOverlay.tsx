/**
 * The one line of coaching a child reads mid-activity (spec §34 phase 7).
 *
 * Same contract as before — `message`, five `category` values, `isCompleted`
 * winning over all of them, and `null` when there is nothing to say (§1) — with
 * the surface rebuilt: the Ionicons `trophy`/`sparkles`/`alert-circle`/`fitness`
 * are `PetalIcon`s in the shared `IconWell` (§7), and the flat coloured bar is a
 * white `Card` with the tone on its rail, so the banner belongs to the same
 * family as every other card in the app (§5, §28).
 *
 * Why not `FeedbackBanner`, which does look like this: that one is an in-flow
 * pastel strip with a three-tone vocabulary (correct / incorrect / info). This
 * has five categories, floats over live video, and needs the extra elevation and
 * opacity to stay readable against whatever the camera happens to see. Forcing
 * the two together would have meant bending the in-flow component out of shape
 * for the one screen that is not in flow.
 *
 * Every tone pairs its colour with a distinct glyph, so the difference between
 * praise, a nudge and a countdown survives for a child who cannot separate the
 * hues (§30) — and the banner is announced politely as an alert as it changes,
 * rather than silently redrawing.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, IconWell } from '../../../components/design';
import type { PetalIconName } from '../../../components/icons';
import { cardSizes, colors, spacing, typography } from '../../../theme';

interface ChildFeedbackOverlayProps {
  message: string;
  category?: 'success' | 'encouragement' | 'retry' | 'completion' | 'countdown';
  isCompleted?: boolean;
}

type Tone = { color: string; soft: string; icon: PetalIconName };

const TONES: Record<
  NonNullable<ChildFeedbackOverlayProps['category']>,
  Tone
> = {
  completion: { color: colors.green, soft: colors.greenSoft, icon: 'trophy' },
  success: { color: colors.primary, soft: colors.primaryLight, icon: 'sparkle' },
  retry: { color: colors.orange, soft: colors.warningLight, icon: 'replay' },
  countdown: { color: colors.purple, soft: colors.secondaryLight, icon: 'clock' },
  /* Neutral coaching — "stand a little further back". Blue is the camera's own
     identity colour (§15), and the seedling reads as "keep going" without
     claiming the pose was right or wrong. */
  encouragement: { color: colors.blue, soft: colors.blueSoft, icon: 'seedling' },
};

export const ChildFeedbackOverlay: React.FC<ChildFeedbackOverlayProps> = ({
  message,
  category = 'encouragement',
  isCompleted = false,
}) => {
  if (!message) return null;

  const tone = TONES[isCompleted ? 'completion' : category];

  return (
    /* `pointerEvents="none"`: the banner sits over the preview, and must never
       swallow a tap meant for the controls beneath it. */
    <View
      style={styles.wrap}
      pointerEvents="none"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Card variant="raised" padding="compact" accent={tone.color} rail contentStyle={styles.row}>
        <IconWell
          icon={tone.icon}
          color={tone.color}
          soft={tone.soft}
          size={cardSizes.iconWellSmall}
          filled
        />
        <Text style={[typography.presets.cardTitle, styles.text]}>{message}</Text>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    /* Shrinks and wraps rather than pushing the icon off a 360px screen (§27). */
    flexShrink: 1,
    flexGrow: 1,
    color: colors.text,
  },
});

export default ChildFeedbackOverlay;
