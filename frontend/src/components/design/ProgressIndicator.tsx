import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, radius, spacing, typography, progressSizes } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * ProgressIndicator (spec §28).
 *
 * One progress component for the whole app, on a 0-100 scale. The codebase
 * previously had three competing progress bars on two different scales
 * (0-1 and 0-100), which is exactly the kind of thing that produces a bar
 * stuck at 1%.
 *
 * Animation is skipped entirely when the OS asks for reduced motion (§30).
 */

export interface ProgressIndicatorProps {
  /** Percentage complete, 0-100. Values outside the range are clamped. */
  value: number;
  /** Bar thickness. Defaults to the standard 10px. */
  height?: number;
  /** Fill colour. Purple by default — progress is a secondary-colour role (§3). */
  color?: string;
  trackColor?: string;
  /** Caption above the bar, e.g. "3 of 8 lessons". */
  label?: string;
  /** Shows "62%" on the right of the label row. */
  showPercentage?: boolean;
  /** Adds a "n of m" readout instead of a percentage. */
  countOf?: { current: number; total: number };
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  height = progressSizes.barHeight,
  color = colors.purple,
  trackColor = colors.skeleton,
  label,
  showPercentage = false,
  countOf,
  style,
  accessibilityLabel,
}) => {
  const pct = clamp(value);
  const reduceMotion = useReducedMotion();
  const width = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    if (reduceMotion) {
      width.setValue(pct);
      return;
    }
    Animated.timing(width, {
      toValue: pct,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [pct, reduceMotion, width]);

  const readout = countOf
    ? `${countOf.current} of ${countOf.total}`
    : showPercentage
    ? `${Math.round(pct)}%`
    : null;

  return (
    <View style={style}>
      {label || readout ? (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[typography.presets.caption, styles.label]} numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <View style={styles.spacer} />
          )}
          {readout ? (
            /* `flexShrink: 1` because RN defaults it to 0: the readout sits in a
               `space-between` row opposite a `flexShrink: 1` label, so without it
               a long readout would be the one thing in the row that cannot yield
               and would overflow the track's width. */
            <Text
              style={[typography.presets.caption, styles.readout]}
              numberOfLines={1}
            >
              {readout}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[styles.track, { height, backgroundColor: trackColor }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Progress'}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: width.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// ProgressRing
// ---------------------------------------------------------------------------

export interface ProgressRingProps {
  /** Percentage complete, 0-100. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  /** Rendered in the middle of the ring — usually the percentage or a count. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = progressSizes.ringSize,
  stroke = progressSizes.ringStroke,
  color = colors.primary,
  trackColor = colors.skeleton,
  children,
  style,
  accessibilityLabel,
}) => {
  const pct = clamp(value);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <View
      style={[{ width: size, height: size }, styles.ring, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? 'Progress'}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          // Start the arc at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={styles.ringCentre}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  readout: {
    color: colors.text,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCentre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressIndicator;
