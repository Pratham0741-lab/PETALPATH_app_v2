import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface NodeCenter {
  x: number;
  y: number;
  color: string;
}

interface CurvedPathConnectorProps {
  nodeCenters: NodeCenter[];
  totalHeight: number;
}

export const CurvedPathConnector: React.FC<CurvedPathConnectorProps> = ({
  nodeCenters,
  totalHeight,
}) => {
  if (nodeCenters.length <= 1) return null;

  const width = 300;

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      <Svg width={width} height={totalHeight} viewBox={`0 0 ${width} ${totalHeight}`}>
        {nodeCenters.map((center, idx) => {
          if (idx === nodeCenters.length - 1) return null;
          const next = nodeCenters[idx + 1];
          const dy = next.y - center.y;

          // Draw cubic Bezier curve segment between node centers
          const cp1x = center.x;
          const cp1y = center.y + dy / 2.5;
          const cp2x = next.x;
          const cp2y = next.y - dy / 2.5;

          const pathD = `M ${center.x} ${center.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
          const segmentColor = next.color;

          return (
            <React.Fragment key={`segment-${idx}`}>
              {/* Background Winding Path - Underlay */}
              <Path
                d={pathD}
                fill="none"
                stroke="#1E234D"
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Highlight Path (Glowing Dotted Path) */}
              <Path
                d={pathD}
                fill="none"
                stroke={segmentColor}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1, 12"
                opacity={0.85}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 300,
    zIndex: 0,
    pointerEvents: 'none',
  },
});
