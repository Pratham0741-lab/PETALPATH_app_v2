import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle,
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

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  color?: string;
  animated?: boolean;
  loading?: boolean;
}

const MARGIN = { top: 20, right: 10, bottom: 30, left: 40 };

const LineSkeleton: React.FC<{ w: number; h: number }> = ({ w, h }) => {
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

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 300,
  height = 200,
  color = colors.primary,
  animated = false,
  loading = false,
}) => {
  const chartW = width - MARGIN.left - MARGIN.right;
  const chartH = height - MARGIN.top - MARGIN.bottom;
  const values = data.map(d => d.value);
  const minVal = data.length > 0 ? Math.min(...values, 0) : 0;
  const maxVal = data.length > 0 ? Math.max(...values, minVal + 1) : 1;

  const xPos = (i: number): number => {
    if (data.length <= 1) return MARGIN.left + chartW / 2;
    return MARGIN.left + (i / (data.length - 1)) * chartW;
  };
  const yPos = (v: number): number =>
    MARGIN.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const yTicks = useMemo(() => {
    const n = 4;
    const step = (maxVal - minVal) / n;
    return Array.from({ length: n + 1 }, (_, i) => minVal + step * i);
  }, [minVal, maxVal]);

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yPos(d.value)}`)
    .join(' ');
  const baselineY = yPos(0);
  const fillPath =
    data.length > 0
      ? `${linePath} L${xPos(data.length - 1)},${baselineY} L${xPos(0)},${baselineY} Z`
      : '';

  const pathLen = useMemo(() => {
    let total = 0;
    for (let i = 1; i < data.length; i++) {
      const dx = xPos(i) - xPos(i - 1);
      const dy = yPos(data[i].value) - yPos(data[i - 1].value);
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chartW, chartH, minVal, maxVal]);

  const strokeOffset = useSharedValue(animated ? pathLen : 0);

  useEffect(() => {
    if (animated) {
      strokeOffset.value = pathLen;
      strokeOffset.value = withTiming(0, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      strokeOffset.value = 0;
    }
  }, [pathLen, animated, strokeOffset]);

  const lineAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeOffset.value,
  }));

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]} accessibilityLabel="Loading chart">
        <LineSkeleton w={width} h={height} />
      </View>
    );
  }

  if (data.length === 0) {
    return <View style={[styles.container, { width, height }]} accessibilityLabel="No chart data" />;
  }

  return (
    <View style={[styles.container, { width, height }]} accessibilityLabel="Line chart">
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
            x={xPos(i)}
            y={height - 6}
            fill={colors.textMuted}
            fontSize={10}
            textAnchor="middle"
            fontFamily={typography.families.rounded}
          >
            {d.label}
          </SvgText>
        ))}
        <Path d={fillPath} fill={color} fillOpacity={0.12} />
        {animated ? (
          <AnimatedPath
            d={linePath}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            animatedProps={lineAnimProps}
          />
        ) : (
          <Path
            d={linePath}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {data.map((d, i) => (
          <Circle
            key={`dot-${i}`}
            cx={xPos(i)}
            cy={yPos(d.value)}
            r={4}
            fill={colors.white}
            stroke={color}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});

export default LineChart;
