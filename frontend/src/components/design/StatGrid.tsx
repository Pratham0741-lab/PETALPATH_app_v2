import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * StatGrid — the little "value over label" tiles used on detail screens
 * (skill detail, module detail, lesson overview).
 *
 * `ParentStatGrid` covers the same idea for the parent area but reads
 * label-first with a heavier number, which suits a dashboard rather than a
 * child-facing screen. This one exists so the three child-facing screens that
 * need stat tiles don't each hand-roll the same markup (spec §28).
 */

export interface Stat {
  /** Short label under the value, e.g. "Difficulty". */
  label: string;
  /** Already-formatted value, e.g. "Level 2" or "3/8". */
  value: string;
  icon?: PetalIconName;
  color?: string;
}

export interface StatGridProps {
  stats: Stat[];
  /**
   * Minimum tile width. Tiles wrap rather than shrink past this. 84 is chosen
   * so three stats still sit on one row inside a roomy-padded card on the
   * narrowest screen §27 names (360px leaves 282px of inner width, and
   * 3 × 84 + 2 × 8 = 268), and four stats fall to 2 + 2 instead of
   * overflowing.
   */
  minTileWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export const StatGrid: React.FC<StatGridProps> = ({ stats, minTileWidth = 84, style }) => (
  <View style={[styles.grid, style]}>
    {stats.map((s) => (
      <View key={s.label} style={[styles.tile, { flexBasis: minTileWidth }]}>
        {s.icon ? (
          <PetalIcon name={s.icon} size={16} color={s.color ?? colors.primary} />
        ) : null}
        <Text
          style={[typography.presets.cardTitle, styles.value, s.icon && styles.valueWithIcon]}
          /*
           * Two lines, not one. A three-across tile on a 360px screen has about
           * 76px of text width, and several callers pass multi-word values that
           * simply do not fit at `cardTitle`'s 20px — "Not started" needs roughly
           * 120px, and `SkillDetailScreen` passes whatever `humanize()` makes of a
           * mastery state. Clamped at one line those were silently ellipsized to
           * things like "Not st…". Wrapping keeps them readable; tiles in a row
           * stretch to the tallest, so the grid stays even.
           */
          numberOfLines={2}
        >
          {s.value}
        </Text>
        <Text style={[typography.presets.caption, styles.label]} numberOfLines={2}>
          {s.label}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardInner,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  value: {
    color: colors.text,
  },
  valueWithIcon: {
    marginTop: 4,
  },
  label: {
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default StatGrid;
