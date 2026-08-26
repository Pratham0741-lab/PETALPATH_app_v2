/**
 * BadgeDetailCard — the large, single-badge presentation used by
 * `BadgeDetailScreen`. The grid uses `BadgeCard`; this is the same badge shown
 * at detail size, in either the earned or the locked state.
 *
 * Redesign notes (§7, §28, §30): this replaces `LockedBadge`, which only covered
 * the locked half. The detail screen used to render a grid tile *and*, for an
 * unearned badge, a second locked card underneath it — the same badge twice, in
 * two different sizes. One card handles both states now, so the screen reads the
 * same either way and the tile stays in the grid where it was designed to sit.
 *
 * Earned is not carried by colour alone: an earned badge gets a green check
 * overlay and the words "Earned on …", a locked one gets a lock glyph and the
 * word "Locked" (§30). The locked card no longer dims itself to `opacity: 0.7` —
 * fading the whole surface dragged the name and description below 4.5:1 and made
 * the one screen that explains the badge harder to read than the tile that led
 * here. Locked is communicated the way the roadmap does it: a muted card, a lock
 * glyph and a label, while the text stays full strength.
 */

import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import { Card, IconWell, ProgressIndicator } from '../../design';
import { PetalIcon } from '../../icons';

export interface BadgeDetailCardProps {
  name: string;
  description?: string | null;
  imagePath?: string | null;
  earned: boolean;
  earnedAt?: string | null;
  /** 0-100. Only shown for a locked badge. */
  progress?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * `toLocaleDateString` on an unparseable value returns the literal string
 * "Invalid Date", which the screen used to print to the child whenever the API
 * sent an earned badge with no timestamp.
 */
const formatEarnedDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
};

export const BadgeDetailCard: React.FC<BadgeDetailCardProps> = ({
  name,
  description,
  imagePath,
  earned,
  earnedAt,
  progress,
  style,
}) => {
  const earnedDate = earned ? formatEarnedDate(earnedAt) : null;
  const statusLabel = earned ? (earnedDate ? `Earned on ${earnedDate}` : 'Earned') : 'Locked';

  return (
    <Card
      variant={earned ? 'raised' : 'muted'}
      padding="roomy"
      style={style}
      accessibilityLabel={`${name}. ${statusLabel}${description ? `. ${description}` : ''}`}
    >
      <View style={styles.artWrap}>
        {imagePath ? (
          <Image
            source={{ uri: imagePath }}
            style={[styles.image, !earned && styles.imageLocked]}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <IconWell
            icon="medal"
            color={earned ? colors.primary : colors.textMuted}
            soft={earned ? colors.primaryLight : colors.skeleton}
            size={72}
            filled={earned}
          />
        )}
        <View style={[styles.marker, earned ? styles.markerEarned : styles.markerLocked]}>
          <PetalIcon
            name={earned ? 'check' : 'lock'}
            size={15}
            color={colors.white}
            filled
            strokeWidth={2.2}
          />
        </View>
      </View>

      <Text style={styles.name}>{name}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}

      <View style={[styles.statusPill, earned ? styles.statusPillEarned : styles.statusPillLocked]}>
        <PetalIcon
          name={earned ? 'check' : 'lock'}
          size={12}
          color={earned ? colors.successDark : colors.textSecondary}
          strokeWidth={2.4}
        />
        <Text numberOfLines={1} style={[styles.statusText, earned && styles.statusTextEarned]}>
          {statusLabel}
        </Text>
      </View>

      {!earned && progress !== undefined ? (
        <ProgressIndicator
          value={progress}
          color={colors.primary}
          label="Progress"
          showPercentage
          style={styles.progress}
        />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  artWrap: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  imageLocked: {
    opacity: 0.6,
  },
  marker: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEarned: {
    backgroundColor: colors.leafGreen,
  },
  markerLocked: {
    backgroundColor: colors.textSecondary,
  },
  name: {
    ...typography.presets.section,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.md,
    /* "Earned on 31 December 2026" in a long locale format has to give way
       rather than widen the pill past the card (§27). */
    flexShrink: 1,
    maxWidth: '100%',
  },
  statusPillEarned: {
    backgroundColor: colors.greenSoft,
  },
  statusPillLocked: {
    backgroundColor: colors.skeleton,
  },
  statusText: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
    flexShrink: 1,
  },
  statusTextEarned: {
    color: colors.successDark,
  },
  progress: {
    marginTop: spacing.md,
  },
});

export default BadgeDetailCard;
