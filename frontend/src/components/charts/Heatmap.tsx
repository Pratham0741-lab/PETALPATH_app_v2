import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Text as SvgText,
  G,
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

interface HeatmapProps {
  data: Array<{ x: string; y: string; value: number }>;
  xLabels: string[];
  yLabels: string[];
  width?: number;
  height?: number;
  colorScale?: string[];
  loading?: boolean;
}

const DEFAULT_COLOR_SCALE = ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'];
const LABEL_WIDTH = 36;
const LABEL_HEIGHT = 20;
const CELL_GAP = 2;

const HeatmapSkeleton: React.FC<{ w: number; h: number }> = ({ w, h }) => {
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
      <AnimatedRect x={LABEL_WIDTH + 4} y={0} width={w - LABEL_WIDTH - 4} height={h} rx={4} animatedProps={animProps} />
    </Svg>
  );
};

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  xLabels,
  yLabels,
  width = 300,
  height = 200,
  colorScale = DEFAULT_COLOR_SCALE,
  loading = false,
}) => {
  const gridW = width - LABEL_WIDTH - 8;
  const gridH = height - LABEL_HEIGHT - 8;
  const cols = xLabels.length;
  const rows = yLabels.length;
  const cellW = cols > 0 ? (gridW - (cols - 1) * CELL_GAP) / cols : 0;
  const cellH = rows > 0 ? (gridH - (rows - 1) * CELL_GAP) / rows : 0;

  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
    value: number;
  } | null>(null);

  const valueMap = new Map<string, number>();
  for (const d of data) {
    valueMap.set(`${d.x}:${d.y}`, d.value);
  }

  const dataValues = data.map(d => d.value);
  const minDataVal = dataValues.length > 0 ? Math.min(...dataValues) : 0;
  const maxDataVal = dataValues.length > 0 ? Math.max(...dataValues, minDataVal + 1) : 1;

  const getCellColor = useCallback(
    (value: number): string => {
      const normalized = (value - minDataVal) / (maxDataVal - minDataVal);
      const idx = Math.floor(normalized * (colorScale.length - 1));
      return colorScale[Math.max(0, Math.min(idx, colorScale.length - 1))];
    },
    [minDataVal, maxDataVal, colorScale],
  );

  const handleCellPress = useCallback(
    (col: number, row: number) => {
      const key = `${xLabels[col]}:${yLabels[row]}`;
      const value = valueMap.get(key);
      if (value !== undefined) {
        setSelectedCell(prev =>
          prev?.x === col && prev?.y === row
            ? null
            : { x: col, y: row, value },
        );
      }
    },
    [xLabels, yLabels, valueMap],
  );

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]} accessibilityLabel="Loading chart">
        <HeatmapSkeleton w={width} h={height} />
      </View>
    );
  }

  if (xLabels.length === 0 || yLabels.length === 0) {
    return <View style={[styles.container, { width, height }]} accessibilityLabel="No chart data" />;
  }

  return (
    <View style={[styles.container, { width, height }]} accessibilityLabel="Heatmap">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Y-axis labels */}
        {yLabels.map((label, row) => (
          <SvgText
            key={`yl-${row}`}
            x={LABEL_WIDTH - 4}
            y={row * (cellH + CELL_GAP) + cellH / 2 + 4}
            fill={colors.textSecondary}
            fontSize={9}
            textAnchor="end"
            fontFamily={typography.families.rounded}
          >
            {label}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, col) => (
          <SvgText
            key={`xl-${col}`}
            x={LABEL_WIDTH + 4 + col * (cellW + CELL_GAP) + cellW / 2}
            y={height - 4}
            fill={colors.textSecondary}
            fontSize={9}
            textAnchor="middle"
            fontFamily={typography.families.rounded}
          >
            {label}
          </SvgText>
        ))}

        {/* Cells */}
        {yLabels.map((rowLabel, row) =>
          xLabels.map((colLabel, col) => {
            const key = `${colLabel}:${rowLabel}`;
            const value = valueMap.get(key);
            const cellColor =
              value !== undefined
                ? getCellColor(value)
                : colorScale[0];
            const x = LABEL_WIDTH + 4 + col * (cellW + CELL_GAP);
            const y = row * (cellH + CELL_GAP);
            const isSelected =
              selectedCell?.x === col && selectedCell?.y === row;

            return (
              <G key={`cell-${col}-${row}`}>
                <Rect
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  rx={3}
                  fill={cellColor}
                  stroke={isSelected ? colors.textPrimary : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  onPress={() => handleCellPress(col, row)}
                />
                {isSelected && value !== undefined && (
                  <SvgText
                    x={x + cellW / 2}
                    y={y + cellH / 2 + 4}
                    fill={colors.textInverse}
                    fontSize={10}
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily={typography.families.rounded}
                  >
                    {value}
                  </SvgText>
                )}
              </G>
            );
          }),
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});

export default Heatmap;
