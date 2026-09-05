import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { colors } from '../../theme';

/**
 * Subtle petal / leaf decoration for screen backgrounds (spec §4).
 *
 * Deliberately restrained: the background stays mostly clean, the shapes sit
 * at low opacity behind the content, and there is no gradient, animation or
 * glassmorphism. Positions are fixed percentages so nothing shifts between
 * renders, and the layer never intercepts touches.
 */

export type PetalDensity = 'none' | 'light' | 'normal';

export interface PetalBackgroundProps {
  /** `light` drops to three shapes; `none` renders nothing. */
  density?: PetalDensity;
  /** Overrides the base fill. Defaults to a pale pink. */
  tint?: string;
  /** Base opacity for the layer. Kept low on purpose. */
  opacity?: number;
}

/** A single five-petal blossom on a 0-40 viewBox. */
const Blossom: React.FC<{ fill: string }> = ({ fill }) => (
  <G>
    {[0, 72, 144, 216, 288].map((angle) => (
      <Path
        key={angle}
        d="M20 20 C 15 12, 16 4, 20 2 C 24 4, 25 12, 20 20 Z"
        fill={fill}
        transform={`rotate(${angle} 20 20)`}
      />
    ))}
  </G>
);

/** A single leaf on a 0-40 viewBox. */
const Leaf: React.FC<{ fill: string }> = ({ fill }) => (
  <G>
    <Path d="M4 36 C 6 18, 18 6, 36 4 C 34 22, 22 34, 4 36 Z" fill={fill} />
  </G>
);

type Shape = {
  kind: 'blossom' | 'leaf';
  /** Percentage offsets so the layout adapts to any screen width. */
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  /** Multiplier applied to the layer opacity. */
  weight: number;
  hue: 'pink' | 'green' | 'yellow';
};

const SHAPES: Shape[] = [
  { kind: 'blossom', top: '2%', right: '-4%', size: 108, rotate: 18, weight: 1, hue: 'pink' },
  { kind: 'leaf', top: '16%', left: '-6%', size: 86, rotate: -24, weight: 0.75, hue: 'green' },
  { kind: 'blossom', top: '38%', left: '-5%', size: 72, rotate: -12, weight: 0.6, hue: 'pink' },
  { kind: 'leaf', top: '54%', right: '-7%', size: 96, rotate: 140, weight: 0.65, hue: 'green' },
  { kind: 'blossom', top: '72%', right: '4%', size: 56, rotate: 32, weight: 0.5, hue: 'yellow' },
  { kind: 'leaf', top: '88%', left: '-4%', size: 78, rotate: 22, weight: 0.55, hue: 'green' },
];

const LIGHT_COUNT = 3;

const PetalBackgroundBase: React.FC<PetalBackgroundProps> = ({
  density = 'normal',
  tint,
  opacity = 0.5,
}) => {
  if (density === 'none') return null;

  const shapes = density === 'light' ? SHAPES.slice(0, LIGHT_COUNT) : SHAPES;

  const hueFill: Record<Shape['hue'], string> = {
    pink: tint ?? colors.pinkSoft,
    green: colors.greenSoft,
    yellow: colors.yellowSoft,
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents="none"
      // Purely decorative — must never be announced or focusable.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {shapes.map((s, i) => (
        <View
          key={`${s.kind}-${i}`}
          style={{
            position: 'absolute',
            top: s.top as any,
            ...(s.left !== undefined ? { left: s.left as any } : null),
            ...(s.right !== undefined ? { right: s.right as any } : null),
            width: s.size,
            height: s.size,
            opacity: s.weight,
            transform: [{ rotate: `${s.rotate}deg` }],
          }}
        >
          <Svg width={s.size} height={s.size} viewBox="0 0 40 40">
            {s.kind === 'blossom' ? (
              <Blossom fill={hueFill[s.hue]} />
            ) : (
              <Leaf fill={hueFill[s.hue]} />
            )}
          </Svg>
        </View>
      ))}
    </View>
  );
};

/**
 * Memoized: the petal layer is on every screen and never changes for a given
 * density/tint, so it should not re-reconcile its SVG shapes each time the screen
 * around it re-renders.
 */
export const PetalBackground = React.memo(PetalBackgroundBase);
PetalBackground.displayName = 'PetalBackground';

export default PetalBackground;
