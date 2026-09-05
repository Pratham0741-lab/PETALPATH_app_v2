/**
 * Canvas Background Scene — PetalPath Drag & Drop Presentation
 *
 * This was a flat `View` filled with `colors.background`, which is why the board
 * read as an empty white sheet next to Watch, Listen and Speak — every other
 * activity has some art behind it. It is now a real scene: sky, sun, meadow
 * hills, a tree and a couple of drifting details, drawn as inline SVG from the
 * palette tokens in the same flat, rounded style as `GardenScene` on Mentors and
 * the blossoms in `PetalBackground`.
 *
 * Three rules the scene has to respect, because it sits *underneath* an
 * interactive board rather than behind static content:
 *
 *  - It never intercepts touches. The whole layer is `pointerEvents="none"` and
 *    hidden from the screen reader; the tiles and targets above it own every
 *    gesture and every announcement.
 *  - It stays out of the way of contrast. The upper band, where the dashed
 *    targets sit, is kept pale; the saturated greens are confined to the bottom
 *    of the frame, below the tile tray. Target borders and tile fills were
 *    measured against these fills, not against white.
 *  - It scales with the board. The `Svg` uses a `viewBox` matching the canvas and
 *    stretches to fill, so the scene tracks the board exactly under
 *    `Canvas`'s `transform: [{ scale }]` instead of drifting at other sizes.
 *
 * A spec-supplied `backgroundColor` still wins over the scene, and a real
 * background image still wins over both.
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '../../../theme';

export interface BackgroundProps {
  backgroundImageUrl?: string;
  backgroundColor?: string;
  /** Virtual canvas size, so the scene can be composed in board coordinates. */
  width?: number;
  height?: number;
  /**
   * Draw the built-in illustrated scene behind the board.
   *
   * Off by default: the board is hosted in an `AppShell` that now supplies the
   * Match wallpaper, and this component's fill is `StyleSheet.absoluteFill`, so
   * leaving it on painted an opaque layer straight over that scene. Transparent
   * by default lets the screen's artwork be the backdrop; pass `scene` to get the
   * drawn one back for a host that has no wallpaper of its own.
   */
  scene?: boolean;
}

/** Matches the portrait canvas the board builder emits. */
const DEFAULT_W = 760;
const DEFAULT_H = 980;

/**
 * The scene, composed in canvas coordinates.
 *
 * Laid out against the board's two bands: targets occupy roughly y=140..500 and
 * the tile tray y=560..900, so the horizon sits at 0.72 of the height — under
 * both — and the sun and cloud stay in the top corners where the board has
 * margin rather than content.
 */
const Scene: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const horizon = height * 0.72;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {/* Sky. Pale on purpose: the dashed targets are drawn on top of it. */}
      <Rect x={0} y={0} width={width} height={horizon} fill={colors.backgroundSecondary} />

      {/* Sun, tucked into the top-right margin. Two rings, no gradient. */}
      <G opacity={0.55}>
        <Circle cx={width * 0.86} cy={height * 0.075} r={62} fill={colors.yellowSoft} />
        <Circle cx={width * 0.86} cy={height * 0.075} r={38} fill={colors.yellow} opacity={0.5} />
      </G>

      {/* Two soft clouds in the opposite corner. */}
      <G opacity={0.5} fill={colors.white}>
        <Ellipse cx={width * 0.16} cy={height * 0.06} rx={54} ry={26} />
        <Ellipse cx={width * 0.25} cy={height * 0.052} rx={36} ry={19} />
        <Ellipse cx={width * 0.6} cy={height * 0.13} rx={42} ry={20} />
      </G>

      {/* Meadow: two overlapping hills, the back one paler for depth. */}
      <Path
        d={`M0 ${horizon} C ${width * 0.22} ${horizon - 74}, ${width * 0.52} ${horizon + 30}, ${width} ${horizon - 52} L ${width} ${height} L 0 ${height} Z`}
        fill={colors.greenSoft}
      />
      <Path
        d={`M0 ${horizon + 68} C ${width * 0.3} ${horizon - 6}, ${width * 0.68} ${horizon + 96}, ${width} ${horizon + 26} L ${width} ${height} L 0 ${height} Z`}
        fill={colors.green}
        opacity={0.42}
      />

      {/* A small tree on the left, clear of the tile columns. */}
      <G opacity={0.75}>
        <Rect
          x={width * 0.1}
          y={horizon + 4}
          width={16}
          height={72}
          rx={7}
          fill={colors.brown}
          opacity={0.65}
        />
        <Circle cx={width * 0.108} cy={horizon - 8} r={44} fill={colors.leafGreen} opacity={0.5} />
        <Circle cx={width * 0.07} cy={horizon + 12} r={30} fill={colors.leafGreen} opacity={0.42} />
        <Circle cx={width * 0.15} cy={horizon + 14} r={27} fill={colors.leafGreen} opacity={0.42} />
      </G>

      {/* Meadow flowers along the very bottom, below everything interactive. */}
      <G opacity={0.6}>
        {[0.32, 0.52, 0.72, 0.9].map((fx, i) => {
          const cx = width * fx;
          const cy = height - 34 - (i % 2) * 18;
          const petal = i % 2 === 0 ? colors.pinkSoft : colors.yellowSoft;
          return (
            <G key={fx}>
              <Rect x={cx - 2} y={cy} width={4} height={26} rx={2} fill={colors.leafGreen} opacity={0.55} />
              {[0, 72, 144, 216, 288].map((a) => (
                <Ellipse
                  key={a}
                  cx={cx}
                  cy={cy - 9}
                  rx={5}
                  ry={10}
                  fill={petal}
                  transform={`rotate(${a} ${cx} ${cy - 9})`}
                />
              ))}
              <Circle cx={cx} cy={cy - 9} r={3.4} fill={colors.accent} />
            </G>
          );
        })}
      </G>

      {/* A butterfly in the sky band — the one bit of whimsy, kept small. */}
      <G opacity={0.5}>
        <Ellipse
          cx={width * 0.3}
          cy={height * 0.2}
          rx={11}
          ry={7}
          fill={colors.lavender}
          transform={`rotate(-24 ${width * 0.3} ${height * 0.2})`}
        />
        <Ellipse
          cx={width * 0.325}
          cy={height * 0.2}
          rx={11}
          ry={7}
          fill={colors.purpleSoft}
          transform={`rotate(24 ${width * 0.325} ${height * 0.2})`}
        />
        <Rect x={width * 0.3105} y={height * 0.192} width={3} height={16} rx={1.5} fill={colors.brown} opacity={0.5} />
      </G>
    </Svg>
  );
};

export const Background: React.FC<BackgroundProps> = ({
  backgroundImageUrl,
  backgroundColor,
  width = DEFAULT_W,
  height = DEFAULT_H,
  scene = false,
}) => {
  if (backgroundImageUrl && !backgroundImageUrl.startsWith('petalpath:asset:placeholder:')) {
    return (
      <Image
        source={{ uri: backgroundImageUrl }}
        style={[StyleSheet.absoluteFill, styles.bgImage]}
        resizeMode="cover"
      />
    );
  }

  /* An explicit fill from the spec is an authoring decision — honour it and skip
     the scene rather than drawing art the author did not ask for. */
  if (backgroundColor) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />;
  }

  /* Nothing authored and no scene requested: stay transparent so the hosting
     screen's wallpaper shows through instead of being covered. */
  if (!scene) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundSecondary }]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Scene width={width} height={height} />
    </View>
  );
};

const styles = StyleSheet.create({
  bgImage: {
    width: '100%',
    height: '100%',
  },
});
