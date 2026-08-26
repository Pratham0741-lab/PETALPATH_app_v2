import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Line,
  Text as SvgText,
  G,
  Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, typography } from '../../theme';
import { summarizeSeries, useChartWidth } from './useChartWidth';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
/* Hoisted: created inside the component body this is a *new component type*
   every render, which throws away and rebuilds the whole bar group each time. */
const AnimatedG = Animated.createAnimatedComponent(G);

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  /** Omit to fill the parent — see `useChartWidth`. */
  width?: number;
  height?: number;
  animated?: boolean;
  loading?: boolean;
  showValues?: boolean;
  /** Overrides the spoken series summary, e.g. to name the unit. */
  accessibilityLabel?: string;
}

const MARGIN = { top: 20, right: 10, bottom: 30, left: 40 };
const BAR_RADIUS = 4;

const BarSkeleton: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);
  const animProps = useAnimatedProps(() => ({
    fill: interpolateColor(pulse.value, [0, 1], [colors.skeleton, colors.skeletonHighlight]),
  }));
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <AnimatedRect
        x={MARGIN.left}
        y={MARGIN.top}
        width={w - MARGIN.left - MARGIN.right}
        height={h - MARGIN.top - MARGIN.bottom}
        rx={4}
        animatedProps={animProps}
      />
    </Svg>
  );
};

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width: widthProp,
  height = 200,
  animated = false,
  loading = false,
  showValues = false,
  accessibilityLabel,
}) => {
  const { width, onLayout, ready } = useChartWidth(widthProp);
  /* No explicit width → fill the parent. `overflow: hidden` on the container
     keeps a stray label from spilling while the first measurement lands. */
  const box = { width: widthProp ?? ('100%' as const), height };
  const chartW = width - MARGIN.left - MARGIN.right;
  const chartH = height - MARGIN.top - MARGIN.bottom;
  const values = data.map(d => d.value);
  const maxVal = data.length > 0 ? Math.max(...values, 1) : 1;

  const yPos = (v: number): number =>
    MARGIN.top + chartH - (v / maxVal) * chartH;
  const baseline = yPos(0);

  const yTicks = useMemo(() => {
    const n = 4;
    const step = maxVal / n;
    return Array.from({ length: n + 1 }, (_, i) => step * i);
  }, [maxVal]);

  const barStep = chartW / data.length;
  const barWidth = Math.max(barStep * 0.6, 4);

  const animOpacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (animated) {
      animOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
    } else {
      animOpacity.value = 1;
    }
  }, [animated, animOpacity]);

  const groupAnimProps = useAnimatedProps(() => ({
    opacity: animOpacity.value,
  }));

  if (loading) {
    return (
      <View style={[styles.container, box]} onLayout={onLayout} accessibilityLabel="Loading chart">
        {ready ? <BarSkeleton w={width} h={height} /> : null}
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={[styles.container, box]} onLayout={onLayout} accessibilityLabel="No chart data" />
    );
  }

  if (!ready) {
    /* The first layout pass has not landed yet. An SVG drawn at width 0 is a
       flash of nothing followed by a jump, so hold the height and wait a frame. */
    return <View style={[styles.container, box]} onLayout={onLayout} />;
  }

  return (
    <View
      style={[styles.container, box]}
      onLayout={onLayout}
      accessible
      accessibilityLabel={accessibilityLabel ?? summarizeSeries('Bar chart', data)}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((t, i) => {
          const y = yPos(t);
          return (
            <G key={`yt-${i}`}>
              <Line
                x1={MARGIN.left}
                y1={y}
                x2={width - MARGIN.right}
                y2={y}
                stroke={colors.divider}
                strokeWidth={1}
              />
              <SvgText
                x={MARGIN.left - 6}
                y={y + 4}
                fill={colors.textMuted}
                fontSize={10}
                textAnchor="end"
                fontFamily={typography.families.rounded}
              >
                {Math.round(t)}
              </SvgText>
            </G>
          );
        })}
        {data.map((d, i) => (
          <SvgText
            key={`xl-${i}`}
            x={MARGIN.left + i * barStep + barStep / 2}
            y={height - 6}
            fill={colors.textMuted}
            fontSize={10}
            textAnchor="middle"
            fontFamily={typography.families.rounded}
          >
            {d.label}
          </SvgText>
        ))}
        <AnimatedG animatedProps={groupAnimProps}>
          {data.map((d, i) => {
            const barX = MARGIN.left + i * barStep + (barStep - barWidth) / 2;
            const barTop = yPos(d.value);
            const barH = baseline - barTop;
            const barColor = d.color || colors.primary;
            const pathD = buildRoundedTopRect(barX, barTop, barWidth, barH, BAR_RADIUS);
            return (
              <G key={`bar-${i}`}>
                <Path d={pathD} fill={barColor} />
                {showValues && (
                  <SvgText
                    x={barX + barWidth / 2}
                    y={barTop - 6}
                    fill={colors.textSecondary}
                    fontSize={10}
                    textAnchor="middle"
                    fontFamily={typography.families.rounded}
                  >
                    {Math.round(d.value)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </AnimatedG>
      </Svg>
    </View>
  );
};

function buildRoundedTopRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const cr = Math.min(r, w / 2, h);
  return [
    `M${x},${y + cr}`,
    `A${cr},${cr} 0 0,1 ${x + cr},${y}`,
    `L${x + w - cr},${y}`,
    `A${cr},${cr} 0 0,1 ${x + w},${y + cr}`,
    `L${x + w},${y + h}`,
    `L${x},${y + h}`,
    'Z',
  ].join('');
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});

export default BarChart;
