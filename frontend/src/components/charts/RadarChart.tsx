import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Polygon,
  Line,
  Text as SvgText,
  G,
  Circle,
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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadarChartProps {
  data: Array<{ label: string; value: number; maxValue?: number }>;
  size?: number;
  color?: string;
  loading?: boolean;
}

const LEVELS = 5;
const LABEL_OFFSET = 20;

const RadarSkeleton: React.FC<{ size: number }> = ({ size }) => {
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
  const center = size / 2;
  const r = size / 2 - 10;
  const pts = 6;
  const polyPoints = Array.from({ length: pts }, (_, i) => {
    const angle = (Math.PI * 2 * i) / pts - Math.PI / 2;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <AnimatedCircle cx={center} cy={center} r={r} animatedProps={animProps} />
    </Svg>
  );
};

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 200,
  color = colors.primary,
  loading = false,
}) => {
  const center = size / 2;
  const radius = size / 2 - 30;
  const count = data.length;

  const angleStep = (Math.PI * 2) / count;

  const getPoint = (index: number, scale: number): { x: number; y: number } => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: center + radius * scale * Math.cos(angle),
      y: center + radius * scale * Math.sin(angle),
    };
  };

  const gridLevels = Array.from({ length: LEVELS }, (_, i) => (i + 1) / LEVELS);

  const dataPolygon = data
    .map((d, i) => {
      const max = d.maxValue ?? 100;
      const scale = Math.max(0, Math.min(1, d.value / max));
      const pt = getPoint(i, scale);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  if (loading) {
    return (
      <View style={[styles.container, { width: size, height: size }]} accessibilityLabel="Loading chart">
        <RadarSkeleton size={size} />
      </View>
    );
  }

  if (data.length === 0) {
    return <View style={[styles.container, { width: size, height: size }]} accessibilityLabel="No chart data" />;
  }

  return (
    <View style={[styles.container, { width: size, height: size }]} accessibilityLabel="Radar chart">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid polygons */}
        {gridLevels.map((level, li) => {
          const pts = data
            .map((_, i) => {
              const pt = getPoint(i, level);
              return `${pt.x},${pt.y}`;
            })
            .join(' ');
          return (
            <Polygon
              key={`grid-${li}`}
              points={pts}
              fill="none"
              stroke={colors.divider}
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          );
        })}

        {/* Axis lines */}
        {data.map((_, i) => {
          const pt = getPoint(i, 1);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke={colors.divider}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={dataPolygon}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const max = d.maxValue ?? 100;
          const scale = Math.max(0, Math.min(1, d.value / max));
          const pt = getPoint(i, scale);
          return (
            <Circle
              key={`dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={color}
            />
          );
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const pt = getPoint(i, 1);
          const labelPt = getPoint(i, 1 + LABEL_OFFSET / radius);
          return (
            <SvgText
              key={`label-${i}`}
              x={labelPt.x}
              y={labelPt.y}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontFamily={typography.families.rounded}
            >
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});

export default RadarChart;
