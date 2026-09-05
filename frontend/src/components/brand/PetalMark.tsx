import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * PetalMark — the PetalPath flower, with an optional glowing loading trace.
 *
 * The mark is hand-authored geometry (see `assets/brand/petal-mark.svg`, which
 * is the design source of truth): one teardrop petal repeated on exact 72°
 * intervals, so the shape stays perfectly symmetrical at any size.
 *
 * When `loading` is set, a bright segment travels around `OUTLINE` — a closed
 * curve that hugs the petal silhouette, peaking at each tip and dipping into the
 * gaps between them. It is animated by sliding `strokeDashoffset` while the dash
 * pattern stays fixed, which is the cheap way to do this: no layout, no path
 * recalculation, just one number changing on the UI thread.
 *
 * The glow is faked with three stacked strokes (wide+faint, mid, narrow+bright)
 * because React Native SVG has no dependable blur filter on Android.
 */

/** One petal, pointing up from the centre; the rest are rotations of it. */
const PETAL = 'M50 50 C42 44 34 38 34 29 C34 21 41 17 50 17 C59 17 66 21 66 29 C66 38 58 44 50 50 Z';

/** Closed curve hugging the petal silhouette, used as the loading track. */
const OUTLINE = 'M80.0 50.0 C79.0 51.6 77.4 52.9 76.5 54.2 C75.5 55.5 74.7 56.5 74.3 57.9 C73.8 59.2 73.9 60.5 73.9 62.2 C73.9 63.8 74.3 65.8 74.3 67.6 C74.2 69.5 74.1 71.8 73.5 73.5 C72.8 75.2 71.7 76.9 70.3 77.9 C68.9 78.9 66.9 79.5 65.1 79.6 C63.2 79.7 61.1 79.0 59.3 78.5 C57.5 78.0 55.7 77.0 54.2 76.5 C52.7 76.0 51.4 75.5 50.0 75.5 C48.6 75.5 47.3 76.0 45.8 76.5 C44.3 77.0 42.5 78.0 40.7 78.5 C38.9 79.0 36.8 79.7 34.9 79.6 C33.1 79.5 31.1 78.9 29.7 77.9 C28.3 76.9 27.2 75.2 26.5 73.5 C25.9 71.8 25.8 69.5 25.7 67.6 C25.7 65.8 26.1 63.8 26.1 62.2 C26.1 60.5 26.2 59.2 25.7 57.9 C25.3 56.5 24.5 55.5 23.5 54.2 C22.6 52.9 21.0 51.6 20.0 50.0 C19.0 48.4 17.7 46.6 17.2 44.8 C16.8 43.0 16.7 41.0 17.2 39.3 C17.7 37.7 19.0 36.1 20.4 34.9 C21.9 33.8 24.0 33.0 25.7 32.4 C27.5 31.7 29.5 31.5 31.0 31.0 C32.6 30.5 33.9 30.2 35.0 29.4 C36.1 28.5 36.9 27.4 37.8 26.1 C38.8 24.8 39.6 22.9 40.7 21.5 C41.9 20.0 43.3 18.2 44.8 17.2 C46.4 16.2 48.3 15.5 50.0 15.5 C51.7 15.5 53.6 16.2 55.2 17.2 C56.7 18.2 58.1 20.0 59.3 21.5 C60.4 22.9 61.2 24.8 62.2 26.1 C63.1 27.4 63.9 28.5 65.0 29.4 C66.1 30.2 67.4 30.5 69.0 31.0 C70.5 31.5 72.5 31.7 74.3 32.4 C76.0 33.0 78.1 33.8 79.6 34.9 C81.0 36.1 82.3 37.7 82.8 39.3 C83.3 41.0 83.2 43.0 82.8 44.8 C82.3 46.6 81.0 48.4 80.0 50.0 Z';

/** Measured length of OUTLINE in viewBox units — the dash maths needs it. */
const OUTLINE_LENGTH = 212.8;

/** How much of the border the moving light occupies. */
const SEGMENT = OUTLINE_LENGTH * 0.22;

const PETALS: { id: string; fill: string; rotation: number }[] = [
  { id: 'yellow', fill: '#F3DC7A', rotation: 0 },
  { id: 'green', fill: '#A6CE61', rotation: 72 },
  { id: 'teal', fill: '#5ABFC1', rotation: 144 },
  { id: 'purple', fill: '#D7A7D7', rotation: 216 },
  { id: 'pink', fill: '#EE537E', rotation: 288 },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface PetalMarkProps {
  /** Rendered width and height in px. */
  size?: number;
  /** Run the glowing trace around the border. */
  loading?: boolean;
  /** Colour of the travelling light. Defaults to the logo's gold. */
  glowColor?: string;
  /** Seconds for one full lap. */
  duration?: number;
}

export const PetalMark: React.FC<PetalMarkProps> = ({
  size = 96,
  loading = false,
  glowColor = '#E9C97A',
  duration = 2.4,
}) => {
  const reduceMotion = useReducedMotion();
  const animate = loading && !reduceMotion;

  /*
   * Drives the dash offset. Counting downwards makes the light travel forwards
   * along the path; one full cycle is exactly one outline length, so the loop
   * repeats seamlessly with no visible jump.
   */
  const offset = useSharedValue(0);

  React.useEffect(() => {
    if (!animate) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-OUTLINE_LENGTH, { duration: duration * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(offset);
  }, [animate, duration, offset]);

  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  /* Wide+faint through narrow+bright: a stand-in for a real blur. */
  const glowLayers = [
    { width: 7, opacity: 0.18 },
    { width: 4, opacity: 0.38 },
    { width: 1.8, opacity: 1 },
  ];

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G opacity={0.88}>
          {PETALS.map((p) => (
            <Path key={p.id} d={PETAL} fill={p.fill} transform={`rotate(${p.rotation} 50 50)`} />
          ))}
        </G>

        <Path
          d="M 36 66 Q 45 59 50 50 Q 55 41 64 34"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray={[0.1, 4.8]}
          opacity={0.95}
        />

        <Circle cx={50} cy={50} r={7.4} fill="#F1D3B0" />

        {animate
          ? glowLayers.map((layer) => (
              <AnimatedPath
                key={layer.width}
                d={OUTLINE}
                fill="none"
                stroke={glowColor}
                strokeWidth={layer.width}
                strokeOpacity={layer.opacity}
                strokeLinecap="round"
                strokeDasharray={[SEGMENT, OUTLINE_LENGTH - SEGMENT]}
                animatedProps={dashProps}
              />
            ))
          : null}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PetalMark;
