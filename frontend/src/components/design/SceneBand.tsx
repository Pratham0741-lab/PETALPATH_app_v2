import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../theme';

/**
 * SceneBand — the garden the app is named after.
 *
 * This is the one piece of the redesign that is allowed to be loud, and it is
 * the only place in PetalPath where progress is legible without reading a
 * number: a hand-built SVG garden that sits at the end of a screen's scroll
 * content, with one flower per unit of progress. At zero it is bare stems and
 * closed buds; as lessons are completed the buds open into blossoms.
 *
 * Why a stateful illustration rather than decoration: the product is called
 * PetalPath, its currency is "Petal Points" and its mentors are garden animals,
 * yet every progress signal it shipped was a bar or a digit. Nothing grew. The
 * band gives the plant metaphor something to actually do, and it gives each
 * screen a ground to end on instead of trailing off into empty background.
 *
 * Deliberately quiet in execution — flat fills, one stroke weight, no animation,
 * no gradient. The boldness budget is spent on the *idea*, not the rendering, so
 * it can appear on several screens without becoming noise. It is also why this
 * is not `PetalBackground`: that layer is decorative, sits behind everything at
 * low opacity and is explicitly hidden from screen readers. This one carries
 * information, so it is announced (see `accessibilityLabel`).
 *
 * Geometry is derived from the measured width, never a fixed screen size (§27),
 * so the flowers keep their proportions from a 360px phone to a tablet instead
 * of being stretched by a `preserveAspectRatio` cheat.
 */

export interface SceneBandProps {
  /**
   * How grown the garden is, 0-100 — the same scale as `ProgressIndicator`, so
   * a caller that already computes a percentage has nothing new to work out.
   * Rounds to whole flowers, so a garden with any progress at all shows at least
   * one open blossom.
   *
   * Pass `null` for a screen that has no progress to report. That draws the same
   * ground planted with leafy shrubs instead of flowers, and drops the band out
   * of the reading order — it becomes scenery, which is honest, where `0` would
   * claim the child has finished nothing.
   */
  progress?: number | null;
  /**
   * Tints the blossoms. Defaults to the brand pink; a subject-coloured screen can
   * pass its own hue so the garden belongs to that subject.
   */
  tint?: string;
  /** Band height. Below about 96 the flowers stop reading as flowers. */
  height?: number;
  /**
   * Draws a short earth trail arriving from the top edge. Turn this on where the
   * band terminates the roadmap ribbon, so the journey visibly lands somewhere.
   */
  trail?: boolean;
  /**
   * One short line over the grass, in `sceneLabel`. Use it to say what the band
   * means the first time a child's parent sees it, not to sell the feature.
   */
  caption?: string;
  /**
   * Overrides the spoken description. The default names the growth rather than
   * the mechanism, because "4 of 7 SVG stems" is not what the picture says.
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_HEIGHT = 132;

/** Roughly one plant per 58px, held between 3 and 7 so it never becomes a hedge. */
const stemCountFor = (width: number) => Math.max(3, Math.min(7, Math.round(width / 58)));

/**
 * Stable pseudo-random in 0-1.
 *
 * `Math.random()` would re-roll on every render and make the garden twitch, which
 * is a real bug and not a charming one. Seeded off the plant index instead, so a
 * given plant is the same plant for the life of the app.
 */
const jitter = (index: number, salt: number) => {
  const n = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

/**
 * A filled hill: a smooth top edge through `pts`, dropped to the band's bottom.
 *
 * Uses the same mid-point cubic the roadmap ribbon uses, so the curvature of the
 * ground matches the curvature of the path that runs into it.
 */
const hillPath = (pts: Array<{ x: number; y: number }>, bottom: number) => {
  if (pts.length < 2) return '';
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  let d = `M ${first.x} ${bottom} L ${first.x} ${first.y}`;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const mx = (a.x + b.x) / 2;
    d += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  }
  d += ` L ${last.x} ${bottom} Z`;
  return d;
};

/** Wavy top edge for a hill, bled past both edges so no seam shows. */
const ridge = (width: number, baseline: number, amp: number, salt: number) => {
  const steps = 4;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    pts.push({
      x: -6 + t * (width + 12),
      y: baseline + (jitter(i, salt) - 0.5) * amp * 2,
    });
  }
  return pts;
};

interface Plant {
  /** Ground contact point. */
  x: number;
  groundY: number;
  /** Flower head. */
  headX: number;
  headY: number;
  petalR: number;
  open: boolean;
}

export const SceneBand: React.FC<SceneBandProps> = ({
  progress = 0,
  tint,
  height = DEFAULT_HEIGHT,
  trail = false,
  caption,
  accessibilityLabel,
  style,
}) => {
  const [width, setWidth] = useState(0);
  const bloom = tint ?? colors.primary;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  const stems = width > 0 ? stemCountFor(width) : 0;
  /**
   * `null` means "this screen has nothing to report", which is a different thing
   * from zero progress. Zero draws closed buds — a promise that flowers are
   * coming — and on a screen that will never track anything that promise is a
   * lie. Decorative mode plants shrubs instead: greenery that says "garden"
   * without claiming a score.
   */
  const decorative = progress === null;
  const clamped = Math.max(0, Math.min(100, progress ?? 0));
  /* Any progress at all earns a flower — a garden that is 5% grown and shows
     nothing open would be telling a five-year-old their work did not count. */
  const openCount =
    clamped <= 0 || decorative
      ? 0
      : Math.max(1, Math.min(stems, Math.round((stems * clamped) / 100)));

  const frontRidge = useMemo(
    () => (width > 0 ? ridge(width, height * 0.62, height * 0.045, 3) : []),
    [width, height],
  );
  const backRidge = useMemo(
    () => (width > 0 ? ridge(width, height * 0.5, height * 0.05, 7) : []),
    [width, height],
  );

  const plants = useMemo<Plant[]>(() => {
    if (width <= 0 || stems <= 0) return [];
    const inset = width * 0.09;
    const span = width - inset * 2;
    return Array.from({ length: stems }, (_, i) => {
      /* Even spacing with a small stable nudge, so the row reads as planted
         rather than as a chart axis. */
      const t = stems === 1 ? 0.5 : i / (stems - 1);
      const x = inset + span * t + (jitter(i, 11) - 0.5) * (span / stems) * 0.35;
      const groundY = height * 0.66 + (jitter(i, 5) - 0.5) * height * 0.05;
      const tall = 0.3 + jitter(i, 17) * 0.24;
      const lean = (jitter(i, 23) - 0.5) * width * 0.035;
      return {
        x,
        groundY,
        headX: x + lean,
        headY: groundY - height * tall,
        petalR: height * (0.052 + jitter(i, 29) * 0.018),
        open: i < openCount,
      };
    });
  }, [width, height, stems, openCount]);

  const spoken =
    accessibilityLabel ??
    (openCount === 0
      ? 'Your garden. Nothing has flowered yet — finish a lesson to open the first flower.'
      : `Your garden. ${openCount} of ${stems} flowers open.`);

  /*
   * A stateful band is announced because it carries information a child cannot
   * otherwise get without reading a number. A decorative one is not: it would
   * add "Your garden, image" to the end of every screen and say nothing.
   */
  const a11y = decorative
    ? ({
        accessible: false,
        /* Both platforms: `importantForAccessibility` is the Android switch and
           `accessibilityElementsHidden` the iOS one. Without the second, a
           `caption` on a decorative band would still be read out on iOS. */
        importantForAccessibility: 'no-hide-descendants',
        accessibilityElementsHidden: true,
      } as const)
    : ({
        accessible: true,
        accessibilityRole: 'image',
        accessibilityLabel: spoken,
      } as const);

  return (
    <View style={[styles.root, { height }, style]} onLayout={onLayout} {...a11y}>
      {width > 0 ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill as StyleProp<ViewStyle>}>
          {/* ---------------------------------------------------------- ground */}
          <Path d={hillPath(backRidge, height)} fill={colors.greenSoft} />
          <Path d={hillPath(frontRidge, height)} fill={colors.meadow} />

          {/* Earth trail arriving from the top, fanning out as it lands. Drawn
              before the plants so stems sit in front of it. */}
          {trail ? (
            <Path
              d={`M ${width / 2 - height * 0.09} ${height * 0.42}
                  C ${width / 2 - height * 0.05} ${height * 0.62}, ${width / 2 - height * 0.22} ${height * 0.72}, ${width / 2 - height * 0.3} ${height}
                  L ${width / 2 + height * 0.3} ${height}
                  C ${width / 2 + height * 0.22} ${height * 0.72}, ${width / 2 + height * 0.05} ${height * 0.62}, ${width / 2 + height * 0.09} ${height * 0.42}
                  Z`}
              fill={colors.soil}
              fillOpacity={0.5}
            />
          ) : null}

          {/* Two stones, so the earth tone has a job on screens without a trail. */}
          <G opacity={0.45}>
            <Ellipse
              cx={width * 0.22}
              cy={height * 0.87}
              rx={height * 0.075}
              ry={height * 0.032}
              fill={colors.soil}
            />
            <Ellipse
              cx={width * 0.79}
              cy={height * 0.93}
              rx={height * 0.055}
              ry={height * 0.026}
              fill={colors.soil}
            />
          </G>

          {/* ---------------------------------------------------------- plants */}
          {plants.map((p, i) => {
            const stemW = Math.max(2, height * 0.019);
            const midY = (p.groundY + p.headY) / 2;
            const leafR = p.petalR * 0.95;
            const leafSide = jitter(i, 31) > 0.5 ? 1 : -1;

            return (
              <G key={i}>
                <Path
                  d={`M ${p.x} ${p.groundY} Q ${p.x + (p.headX - p.x) * 0.1} ${midY}, ${p.headX} ${p.headY}`}
                  stroke={colors.leafGreen}
                  strokeWidth={stemW}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* One leaf, alternating side. Two looked like a diagram. */}
                <Path
                  d={`M ${p.x + (p.headX - p.x) * 0.35} ${midY + leafR * 0.2}
                      C ${p.x + leafSide * leafR * 1.5} ${midY - leafR * 0.5},
                        ${p.x + leafSide * leafR * 1.7} ${midY + leafR * 0.6},
                        ${p.x + (p.headX - p.x) * 0.35} ${midY + leafR * 0.2} Z`}
                  fill={colors.leafGreen}
                />

                {decorative ? (
                  /* A leafy shrub: three overlapping ellipses, no flower head
                     and no bud, so there is nothing here for a child to read as
                     "not done yet". */
                  <G>
                    <Ellipse
                      cx={p.headX - p.petalR * 0.62}
                      cy={p.headY + p.petalR * 0.18}
                      rx={p.petalR * 0.78}
                      ry={p.petalR * 0.62}
                      fill={colors.greenSoft}
                    />
                    <Ellipse
                      cx={p.headX + p.petalR * 0.62}
                      cy={p.headY + p.petalR * 0.24}
                      rx={p.petalR * 0.7}
                      ry={p.petalR * 0.56}
                      fill={colors.greenSoft}
                    />
                    <Ellipse
                      cx={p.headX}
                      cy={p.headY - p.petalR * 0.34}
                      rx={p.petalR * 0.9}
                      ry={p.petalR * 0.78}
                      fill={colors.leafGreen}
                      fillOpacity={0.85}
                    />
                  </G>
                ) : p.open ? (
                  <G>
                    {[0, 72, 144, 216, 288].map((angle) => (
                      <Ellipse
                        key={angle}
                        cx={p.headX}
                        cy={p.headY - p.petalR * 0.82}
                        rx={p.petalR * 0.52}
                        ry={p.petalR * 0.86}
                        fill={bloom}
                        transform={`rotate(${angle} ${p.headX} ${p.headY})`}
                      />
                    ))}
                    <Circle
                      cx={p.headX}
                      cy={p.headY}
                      r={p.petalR * 0.42}
                      fill={colors.yellow}
                    />
                  </G>
                ) : (
                  /* A closed bud, not a greyed-out flower: this lesson is still
                     ahead of the child, not disabled. */
                  <G>
                    <Path
                      d={`M ${p.headX} ${p.headY + p.petalR * 0.9}
                          C ${p.headX - p.petalR * 0.72} ${p.headY + p.petalR * 0.2},
                            ${p.headX - p.petalR * 0.6} ${p.headY - p.petalR * 1.0},
                            ${p.headX} ${p.headY - p.petalR * 1.3}
                          C ${p.headX + p.petalR * 0.6} ${p.headY - p.petalR * 1.0},
                            ${p.headX + p.petalR * 0.72} ${p.headY + p.petalR * 0.2},
                            ${p.headX} ${p.headY + p.petalR * 0.9} Z`}
                      fill={colors.pinkSoft}
                    />
                    <Path
                      d={`M ${p.headX - p.petalR * 0.62} ${p.headY + p.petalR * 0.55}
                          Q ${p.headX} ${p.headY + p.petalR * 1.35},
                            ${p.headX + p.petalR * 0.62} ${p.headY + p.petalR * 0.55} Z`}
                      fill={colors.leafGreen}
                    />
                  </G>
                )}
              </G>
            );
          })}
        </Svg>
      ) : null}

      {caption ? (
        <Text
          style={[typography.presets.sceneLabel, styles.caption]}
          numberOfLines={2}
          /* The band above already speaks the progress; this line is the same
             information a second time, so it stays out of the reading order. */
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  caption: {
    /* Sits in the sky above the ridge line, where there is nothing to compete
       with, rather than on the grass where the flowers are. */
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});

export default SceneBand;
