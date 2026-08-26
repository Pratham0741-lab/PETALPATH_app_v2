import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, badgeSizes, BadgeSizeToken } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * StatusBadge & RewardBadge (spec §28, §30).
 *
 * Both always pair a colour with an icon and a word, so state is never
 * communicated by colour alone.
 */

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

export type LessonStatus = 'completed' | 'current' | 'locked' | 'available' | 'new';

const STATUS: Record<
  LessonStatus,
  { label: string; icon: PetalIconName; fg: string; bg: string }
> = {
  completed: { label: 'Done', icon: 'check', fg: colors.successDark, bg: colors.greenSoft },
  // Purple is reserved for the "current" marker and selected states (§3).
  current: { label: 'Current', icon: 'play', fg: colors.purpleDark, bg: colors.secondaryLight },
  locked: { label: 'Locked', icon: 'lock', fg: colors.textSecondary, bg: colors.skeleton },
  available: { label: 'Ready', icon: 'forward', fg: colors.blueDark, bg: colors.blueSoft },
  new: { label: 'New', icon: 'sparkle', fg: colors.primaryDark, bg: colors.primaryLight },
};

export interface StatusBadgeProps {
  status: LessonStatus;
  /** Overrides the default word ("Done", "Locked", …). */
  label?: string;
  size?: BadgeSizeToken;
  /** Hide the text and show only the icon. Keeps an accessible label. */
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  iconOnly = false,
  style,
}) => {
  const s = badgeSizes[size];
  const cfg = STATUS[status];
  const text = label ?? cfg.label;

  return (
    <View
      style={[
        styles.pill,
        {
          height: s.height,
          paddingHorizontal: iconOnly ? 0 : s.paddingHorizontal,
          width: iconOnly ? s.height : undefined,
          backgroundColor: cfg.bg,
        },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <PetalIcon name={cfg.icon} size={s.iconSize} color={cfg.fg} filled />
      {iconOnly ? null : (
        <Text
          numberOfLines={1}
          style={[typography.presets.caption, styles.pillText, { fontSize: s.fontSize, color: cfg.fg }]}
        >
          {text}
        </Text>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// RewardBadge
// ---------------------------------------------------------------------------

export type RewardKind = 'stars' | 'xp' | 'coins' | 'streak' | 'hearts' | 'petals';

const REWARD: Record<RewardKind, { icon: PetalIconName; fg: string; bg: string; unit: string }> = {
  stars: { icon: 'star', fg: '#8A6A0C', bg: colors.yellowSoft, unit: 'Stars' },
  xp: { icon: 'sparkle', fg: colors.purpleDark, bg: colors.secondaryLight, unit: 'XP' },
  coins: { icon: 'coin', fg: '#8A6A0C', bg: colors.yellowSoft, unit: 'Coins' },
  streak: { icon: 'flame', fg: colors.warningDark, bg: colors.warningLight, unit: 'Day Streak' },
  hearts: { icon: 'heart', fg: colors.primaryDark, bg: colors.primaryLight, unit: 'Hearts' },
  petals: { icon: 'seedling', fg: colors.successDark, bg: colors.greenSoft, unit: 'Petals' },
};

export interface RewardBadgeProps {
  kind: RewardKind;
  value: number | string;
  /** Show the unit word after the number, e.g. "12 Stars". */
  showUnit?: boolean;
  /** Prefix the value with "+" — for rewards being *earned*. */
  signed?: boolean;
  size?: BadgeSizeToken;
  style?: StyleProp<ViewStyle>;
}

export const RewardBadge: React.FC<RewardBadgeProps> = ({
  kind,
  value,
  showUnit = false,
  signed = false,
  size = 'md',
  style,
}) => {
  const s = badgeSizes[size];
  const cfg = REWARD[kind];
  const shown = `${signed ? '+' : ''}${value}${showUnit ? ` ${cfg.unit}` : ''}`;

  return (
    <View
      style={[
        styles.pill,
        { height: s.height, paddingHorizontal: s.paddingHorizontal, backgroundColor: cfg.bg },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${signed ? 'plus ' : ''}${value} ${cfg.unit}`}
    >
      <PetalIcon name={cfg.icon} size={s.iconSize} color={cfg.fg} filled />
      <Text
        /* The pill has a fixed `height` and `flexShrink: 1`, so without these two
           a squeezed chip wrapped "12 Petals" onto a second line and clipped it
           mid-glyph — the exact "text going outside the box" the header showed.
           `StatusBadge` already had them; `RewardBadge` did not. */
        numberOfLines={1}
        style={[
          typography.presets.caption,
          styles.pillText,
          { fontSize: s.fontSize, color: cfg.fg },
        ]}
      >
        {shown}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// LivesIndicator
// ---------------------------------------------------------------------------

export interface LivesIndicatorProps {
  /** Hearts remaining. */
  lives: number;
  /** Total hearts; drives how many outlines are drawn. Default 3. */
  max?: number;
  size?: number;
  /** Compact "3 Lives" pill instead of drawn hearts. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Draws the remaining hearts as filled/outlined SVG hearts — replaces the
 * inline `💖 {lives} Lives` text that was repeated across the activity
 * screens.
 */
export const LivesIndicator: React.FC<LivesIndicatorProps> = ({
  lives,
  max = 3,
  size = 18,
  compact = false,
  style,
}) => {
  const safeMax = Math.max(1, max);
  const filled = Math.max(0, Math.min(safeMax, lives));

  if (compact) {
    return <RewardBadge kind="hearts" value={filled} showUnit size="sm" style={style} />;
  }

  return (
    <View
      style={[styles.lives, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${filled} of ${safeMax} hearts remaining`}
    >
      {Array.from({ length: safeMax }).map((_, i) => (
        <PetalIcon
          key={i}
          name="heart"
          size={size}
          filled={i < filled}
          color={i < filled ? colors.primary : colors.border}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    /* A chip placed in a row next to a title must give way rather than push it
       off screen — `StatusBadge` takes a caller-supplied label (§27). */
    flexShrink: 1,
    maxWidth: '100%',
  },
  /* Ellipsizes instead of widening the chip past its container. */
  pillText: {
    flexShrink: 1,
  },
  lives: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
});

export default StatusBadge;
