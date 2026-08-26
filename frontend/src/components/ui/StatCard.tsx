/**
 * StatCard — a single headline figure with an optional trend.
 *
 * Redesign notes (§7, §28, §30): this is exported from the `components/ui` barrel
 * and so ships in the bundle, but nothing renders it today. It was the last file
 * in the navigable app still importing Ionicons, so it is on the design system
 * now rather than left as a trap for whoever imports it next.
 *
 * What changed beyond the styling:
 *
 *  - `icon` was `React.ReactNode` that the body then tested with `typeof icon ===
 *    'string'` and fed to `Ionicons name={icon as any}` — an untyped string
 *    channel into a second icon library. It is a `PetalIconName` now, so a bad
 *    name is a compile error.
 *  - The trend arrows were the text characters `↑ ↓ →`, which screen readers
 *    announce as "up arrow" or skip entirely depending on the voice. They are
 *    `arrowUp`/`arrowDown`/`forward` glyphs, and the direction is also in the
 *    accessible label.
 *  - The trend badge drew `colors.success` on a 12%-alpha wash of itself, about
 *    2:1. Each direction now pairs a dark foreground with its soft token.
 *  - `onPress` wrapped a styled `View` in a `Pressable` with a hand-rolled scale
 *    transform. `Card` already is a semantic, animated pressable.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { Card, IconWell } from '../design';
import { PetalIcon, PetalIconName } from '../icons';

type StatCardVariant = 'elevated' | 'outlined' | 'flat';
type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: PetalIconName;
  /** Tints the icon well. Defaults to the brand pink. */
  iconColor?: string;
  iconSoft?: string;
  trend?: TrendDirection;
  trendValue?: string;
  variant?: StatCardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const CARD_VARIANT: Record<StatCardVariant, 'raised' | 'flat' | 'muted'> = {
  elevated: 'raised',
  outlined: 'flat',
  flat: 'muted',
};

const TREND: Record<
  TrendDirection,
  { icon: PetalIconName; color: string; soft: string; word: string }
> = {
  up: { icon: 'arrowUp', color: colors.successDark, soft: colors.greenSoft, word: 'up' },
  down: { icon: 'arrowDown', color: colors.error, soft: colors.errorLight, word: 'down' },
  neutral: { icon: 'forward', color: colors.textSecondary, soft: colors.skeleton, word: 'steady' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  iconColor,
  iconSoft,
  trend,
  trendValue,
  variant = 'elevated',
  onPress,
  style,
}) => {
  const t = trend ? TREND[trend] : null;

  const label = [
    `${title}: ${value}${unit ? ` ${unit}` : ''}`,
    t ? `Trending ${t.word}${trendValue ? ` by ${trendValue}` : ''}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Card
      variant={CARD_VARIANT[variant]}
      onPress={onPress}
      style={style}
      accessibilityLabel={label}
    >
      <View style={styles.topRow}>
        {icon ? (
          <IconWell
            icon={icon}
            color={iconColor ?? colors.primary}
            soft={iconSoft ?? colors.primaryLight}
            size={36}
          />
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
          {unit ? <Text style={styles.unit}> {unit}</Text> : null}
        </Text>

        {t ? (
          <View style={[styles.trendBadge, { backgroundColor: t.soft }]}>
            <PetalIcon name={t.icon} size={12} color={t.color} strokeWidth={2.4} />
            {trendValue ? (
              <Text style={[styles.trendValue, { color: t.color }]} numberOfLines={1}>
                {trendValue}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.presets.subtle,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  value: {
    ...typography.presets.stat,
    color: colors.text,
    flexShrink: 1,
  },
  unit: {
    ...typography.presets.body,
    color: colors.textSecondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  trendValue: {
    ...typography.presets.caption,
    fontWeight: typography.weights.bold,
  },
});

export default StatCard;
