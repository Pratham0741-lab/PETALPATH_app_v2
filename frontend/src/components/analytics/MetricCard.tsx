import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { badgeSizes, colors, radius, spacing, typography } from '../../theme';
import { Card } from '../design/Card';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * The three things all eleven analytics cards were rebuilding by hand
 * (spec §28, §29).
 *
 * Every card in this folder opened with the same eleven-line private
 * `styles.header` — `typography.sizes.cardTitle` + `weights.bold` + a
 * `{ color: themeColors.text }` override — and four of them hand-rolled their
 * own trend indicator, in two different vocabularies ('up'/'down'/'stable' in
 * three cards, 'improving'/'declining'/'stable' in the fourth) with two
 * different glyph sets. That is eleven places to change a heading and four
 * places for a trend to drift out of agreement.
 *
 *  - `MetricCard`   — the card, the heading, the loading swap, the a11y group.
 *  - `TrendPill`    — one mapping from direction to colour + glyph + word.
 *  - `MetricFigure` — the centred ring/number/caption stack four cards share.
 *
 * The public prop signature of every card is unchanged: the parent screens pass
 * real query data straight into them and none of that data changes shape here.
 */

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

export interface MetricCardProps {
  title: string;
  /** Small tinted glyph before the heading. */
  icon?: PetalIconName;
  /** Right-aligned control in the heading row, e.g. a period switch. */
  right?: React.ReactNode;
  /**
   * Announced in place of the body's individual texts. A card is a *reading*,
   * not a list of loose numbers, so grouping it lets a screen reader deliver it
   * as one sentence. Omit it when the body contains controls — grouping hides
   * them from the accessibility tree; put those in `footer` instead.
   */
  accessibilityLabel?: string;
  loading?: boolean;
  /** Rendered instead of `children` while `loading`. */
  skeleton?: React.ReactNode;
  children?: React.ReactNode;
  /** Rendered after the body and never grouped — the slot for buttons. */
  footer?: React.ReactNode;
  /** Small print under everything. */
  footnote?: string;
  style?: StyleProp<ViewStyle>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon,
  right,
  accessibilityLabel,
  loading = false,
  skeleton,
  children,
  footer,
  footnote,
  style,
}) => (
  <Card variant="raised" padding="normal" style={style}>
    <View style={styles.head}>
      {icon ? (
        <View style={styles.headIcon}>
          <PetalIcon name={icon} size={16} color={colors.primary} />
        </View>
      ) : null}
      <Text
        style={[typography.presets.cardTitle, styles.title]}
        accessibilityRole="header"
        numberOfLines={2}
      >
        {title}
      </Text>
      {right}
    </View>

    {/* The heading is known before the data lands, so it never shimmers — only
        the body is swapped for its skeleton. */}
    {loading ? (
      <View accessible accessibilityLabel={`Loading ${title}`}>{skeleton}</View>
    ) : accessibilityLabel ? (
      <View accessible accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    ) : (
      children
    )}

    {footer}

    {footnote ? (
      <Text style={[typography.presets.caption, styles.footnote]}>{footnote}</Text>
    ) : null}
  </Card>
);

// ---------------------------------------------------------------------------
// TrendPill
// ---------------------------------------------------------------------------

/** Both vocabularies the existing card props use, so no signature has to move. */
export type TrendDirection = 'up' | 'down' | 'stable' | 'improving' | 'declining';

type TrendTone = 'up' | 'down' | 'flat';

const TREND_TONE: Record<TrendDirection, TrendTone> = {
  up: 'up',
  improving: 'up',
  down: 'down',
  declining: 'down',
  stable: 'flat',
};

export interface TrendVisual {
  word: string;
  icon: PetalIconName;
  /** Foreground that clears contrast on `bg`. */
  fg: string;
  bg: string;
}

const TREND: Record<TrendTone, TrendVisual> = {
  up: { word: 'Improving', icon: 'arrowUp', fg: colors.successDark, bg: colors.successLight },
  down: { word: 'Declining', icon: 'arrowDown', fg: colors.errorDark, bg: colors.errorLight },
  /* No sideways arrow in the icon set, and inventing one for a single state is
     not worth it — a chevron plus the word "Steady" reads the same. */
  flat: { word: 'Steady', icon: 'forward', fg: colors.textSecondary, bg: colors.skeleton },
};

/** For cards that draw the trend as something other than a pill. */
export const trendVisual = (direction: TrendDirection): TrendVisual => TREND[TREND_TONE[direction]];

export interface TrendPillProps {
  direction: TrendDirection;
  /** Percentage change, rendered after the word as "+12%". */
  change?: number;
  /** Overrides the word — e.g. "Faster" instead of "Improving". */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Colour + glyph + word, always all three. A parent glancing at a red pill and
 * a green pill in the same list should not have to be able to tell red from
 * green to know which is which (§30).
 */
export const TrendPill: React.FC<TrendPillProps> = ({ direction, change, label, style }) => {
  const cfg = TREND[TREND_TONE[direction]];
  const s = badgeSizes.sm;
  const word = label ?? cfg.word;
  const delta =
    typeof change === 'number' && Number.isFinite(change)
      ? `${change >= 0 ? '+' : ''}${Math.round(change)}%`
      : null;

  return (
    <View
      style={[
        styles.pill,
        { height: s.height, paddingHorizontal: s.paddingHorizontal, backgroundColor: cfg.bg },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={delta ? `${word}, ${delta} change` : word}
    >
      <PetalIcon name={cfg.icon} size={s.iconSize} color={cfg.fg} />
      <Text style={[typography.presets.caption, { fontSize: s.fontSize, color: cfg.fg }]}>
        {delta ? `${word} ${delta}` : word}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// MetricFigure
// ---------------------------------------------------------------------------

export interface MetricFigureProps {
  /** The hero element — a ProgressRing, an IconWell, anything centred. */
  above?: React.ReactNode;
  /** The headline number or word. */
  value?: string;
  valueColor?: string;
  /** Uses the larger `display` size — for a bare number with no ring. */
  large?: boolean;
  /** Explains the number underneath it. */
  caption?: string;
  /** Usually a TrendPill. */
  below?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The centred hero stack — ring or glyph, big value, caption, trend pill — that
 * ProgressSummary, CompletionRate, LearningTrend and LearningVelocity each had
 * their own slightly different version of.
 */
export const MetricFigure: React.FC<MetricFigureProps> = ({
  above,
  value,
  valueColor = colors.text,
  large = false,
  caption,
  below,
  style,
}) => (
  <View style={[styles.figure, style]}>
    {above}
    {value ? (
      <Text
        style={[
          large ? typography.presets.display : typography.presets.stat,
          { color: valueColor },
          styles.figureValue,
        ]}
      >
        {value}
      </Text>
    ) : null}
    {caption ? (
      <Text style={[typography.presets.subtle, styles.figureCaption]}>{caption}</Text>
    ) : null}
    {below}
  </View>
);

const styles = StyleSheet.create({
  // ---------------------------------------------------------------- heading
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
  },
  footnote: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // ------------------------------------------------------------------- pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.pill,
    alignSelf: 'center',
  },

  // ----------------------------------------------------------------- figure
  figure: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  figureValue: {
    textAlign: 'center',
  },
  figureCaption: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default MetricCard;
