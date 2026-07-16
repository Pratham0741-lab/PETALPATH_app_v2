import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Line,
  Text as SvgText,
  G,
  Rect,
  Defs,
  LinearGradient,
  Stop,
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

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface AreaChartProps {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  color?: string;
  gradient?: boolean;
  loading?: boolean;
}

const MARGIN = { top: 20, right: 10, bottom: 30, left: 40 };
const GRADIENT_ID = 'areaChartGradient';

const AreaSkeleton: React.FC<{ w: number; h: number }> = ({ w, h }) => {
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

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  width = 300,
  height = 200,
  color = colors.primary,
  gradient: useGradient = false,
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

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yPos(d.value)}`)
    .join(' ');
  const baseline = yPos(0);
  const fillPath =
    data.length > 0
      ? `${linePath} L${xPos(data.length - 1)},${baseline} L${xPos(0)},${baseline} Z`
      : '';

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]} accessibilityLabel="Loading chart">
        <AreaSkeleton w={width} h={height} />
      </View>
    );
  }

  if (data.length === 0) {
    return <View style={[styles.container, { width, height }]} accessibilityLabel="No chart data" />;
  }

  const fill = useGradient ? `url(#${GRADIENT_ID})` : color;

  return (
    <View style={[styles.container, { width, height }]} accessibilityLabel="Area chart">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {useGradient && (
          <Defs>
            <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </LinearGradient>
          </Defs>
        )}

        {/* Y-axis reference lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = MARGIN.top + chartH - frac * chartH;
          const val = minVal + (maxVal - minVal) * frac;
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
                {Math.round(val)}
              </SvgText>
            </G>
          );
        })}

        {/* X-axis labels */}
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

        {/* Area fill */}
        <Path d={fillPath} fill={fill} />

        {/* Line */}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});

export default AreaChart;
