import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { colors } from '../../theme';
import type { BloomStage } from '../../types/garden';
import { BLOOM_IMAGES } from '../../assets/garden';

/**
 * SkillBloom — one skill drawn as a flower at its stage of growth.
 *
 * Presentation only. The backend (`garden-view.ts`) decides a skill's `stage`
 * and whether it `needsWater`; this component just draws what it is handed, so
 * the band-order trap that has bitten nine call sites can never reach the glyph.
 *
 * Legible without reading (spec §30). The five stages are five genuinely
 * different SHAPES, weakest to fullest — a seed in soil, a two-leaf sprout, a
 * closed bud, a flower still cupped in its calyx, a full open bloom — so a child
 * who cannot yet read a percentage can still see growth. Colour only reinforces
 * the shape; it is never the sole signal. "Thirsty" is likewise a shape, not a
 * tint: a water droplet is added to the glyph (and echoed in the spoken label),
 * so the cue survives colour-blindness and greyscale.
 *
 * Drawn in the same flat vocabulary as `SceneBand` and `AvatarGlyph`: flat
 * fills, one stroke weight, no gradient, no animation. The boldness budget of
 * the garden is spent on the idea, not the rendering.
 *
 * This glyph carries no touch target of its own — a bloom you can tap is wrapped
 * in a Pressable by its screen, which owns the 48px minimum (§30).
 */

/** Weakest → fullest. Exported so callers can order a legend without re-deriving it. */
export const BLOOM_STAGE_ORDER: readonly BloomStage[] = [
  'seed',
  'sprout',
  'bud',
  'opening',
  'bloom',
];

/** The growth half of a spoken label, e.g. "in full bloom". Named by shape, never a number. */
export function bloomStagePhrase(stage: BloomStage): string {
  switch (stage) {
    case 'seed':
      return 'not started yet';
    case 'sprout':
      return 'just sprouting';
    case 'bud':
      return 'growing';
    case 'opening':
      return 'starting to bloom';
    case 'bloom':
      return 'in full bloom';
    default:
      return 'growing';
  }
}

/** Full spoken label for a bloom: its growth, plus the watering call if it is thirsty. */
export function bloomStageLabel(stage: BloomStage, thirsty = false): string {
  const phrase = bloomStagePhrase(stage);
  return thirsty ? `${phrase}, needs watering` : phrase;
}

/**
 * The flower itself, in a 48×48 viewBox with the soil line at y≈41. Each stage
 * is authored as its own block rather than tweened, so the shapes stay distinct
 * at every size instead of blurring into one graded circle.
 */
function bloomArt(stage: BloomStage, tint: string): React.ReactNode {
  // Shared parts, so every planted stage sits on the same ground.
  const soil = (rx: number) => (
    <Ellipse cx={24} cy={41} rx={rx} ry={3.2} fill={colors.soil} fillOpacity={0.5} />
  );
  const stem = (topY: number) => (
    <Path
      d={`M24 41 L24 ${topY}`}
      stroke={colors.leafGreen}
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    />
  );
  // One leaf on the stem, alternating look kept simple — two read as a diagram.
  const leaf = (
    <Path d="M24 31 C18 28 14.5 30 14.5 34 C19.5 35 23 33 24 31 Z" fill={colors.leafGreen} />
  );

  switch (stage) {
    case 'seed':
      // No stem: a seed half-buried in a little mound of soil. Nothing here reads
      // as a greyed-out flower, only as "planted, not yet growing".
      return (
        <G>
          <Ellipse cx={24} cy={41} rx={12} ry={3.8} fill={colors.soil} fillOpacity={0.55} />
          <Ellipse
            cx={24}
            cy={37.5}
            rx={3.3}
            ry={4.6}
            fill={colors.brown}
            transform="rotate(-20 24 37.5)"
          />
          <Ellipse
            cx={22.7}
            cy={35.9}
            rx={0.9}
            ry={1.6}
            fill={colors.white}
            fillOpacity={0.45}
            transform="rotate(-20 24 37.5)"
          />
        </G>
      );

    case 'sprout':
      // A short shoot with two little leaves and a soft green tip — no bud yet.
      return (
        <G>
          {soil(9)}
          {stem(22)}
          <Path d="M24 30 C18.5 27 15 29 15 33 C20 34 23 32 24 30 Z" fill={colors.leafGreen} />
          <Path d="M24 26 C29.5 23 33 25 33 29 C28 30 25 28 24 26 Z" fill={colors.green} />
          <Circle cx={24} cy={21} r={2.5} fill={colors.green} />
        </G>
      );

    case 'bud':
      // A closed teardrop bud in a green cup: about to flower, tinted but soft.
      return (
        <G>
          {soil(9)}
          {stem(20)}
          {leaf}
          <Path
            d="M24 6 C17 12 17 19 24 22 C31 19 31 12 24 6 Z"
            fill={tint}
            fillOpacity={0.5}
          />
          <Path d="M19 19 Q24 26 29 19 Q24 22 24 22 Q24 22 19 19 Z" fill={colors.leafGreen} />
        </G>
      );

    case 'opening': {
      // An upward-facing cup of three petals just parting — a tulip shape, not the
      // flat daisy of a full bloom and not the single closed teardrop of a bud.
      // Its own silhouette is the signal, so it survives greyscale.
      return (
        <G>
          {soil(9)}
          {stem(20)}
          {leaf}
          <Path d="M24 20 C19 19 17 12.5 19 7.5 C22 10.5 23 15 24 20 Z" fill={tint} />
          <Path d="M24 20 C29 19 31 12.5 29 7.5 C26 10.5 25 15 24 20 Z" fill={tint} />
          <Path d="M24 20 C22 14 22 9.5 24 6.5 C26 9.5 26 14 24 20 Z" fill={tint} fillOpacity={0.85} />
          <Path d="M20.5 19.5 Q24 24 27.5 19.5 Q24 21.5 24 21.5 Q24 21.5 20.5 19.5 Z" fill={colors.leafGreen} />
        </G>
      );
    }

    case 'bloom':
    default: {
      // Full open flower: broad petals, no calyx showing, a bright centre.
      const center = { x: 24, y: 14 };
      return (
        <G>
          {soil(9)}
          {stem(19)}
          {leaf}
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse
              key={a}
              cx={center.x}
              cy={center.y - 6.4}
              rx={3.4}
              ry={6.4}
              fill={tint}
              transform={`rotate(${a} ${center.x} ${center.y})`}
            />
          ))}
          <Circle cx={center.x} cy={center.y} r={3.4} fill={colors.yellow} />
          <Circle cx={center.x} cy={center.y} r={1.5} fill={colors.orange} fillOpacity={0.55} />
        </G>
      );
    }
  }
}

/** A water droplet badge, top-right, with a light halo so it reads on any petal colour. */
function thirstyDrop(): React.ReactNode {
  return (
    <G>
      <Path
        d="M39 4 C42.4 8.2 43.2 10.4 43.2 12.2 C43.2 14.9 41.3 16.8 39 16.8 C36.7 16.8 34.8 14.9 34.8 12.2 C34.8 10.4 35.6 8.2 39 4 Z"
        fill={colors.white}
      />
      <Path
        d="M39 6 C41.7 9.4 42.3 11.2 42.3 12.5 C42.3 14.4 40.8 15.9 39 15.9 C37.2 15.9 35.7 14.4 35.7 12.5 C35.7 11.2 36.3 9.4 39 6 Z"
        fill={colors.blue}
      />
      <Ellipse cx={37.7} cy={12.6} rx={0.8} ry={1.3} fill={colors.white} fillOpacity={0.7} />
    </G>
  );
}

export interface SkillBloomProps {
  /** Which of the five shapes to draw. The backend owns this decision. */
  stage: BloomStage;
  /** Adds the water-droplet badge and the "needs watering" clause to the label. */
  thirsty?: boolean;
  /** Glyph box in px. Keep at ~40 or above; the petals and droplet stop reading below that. */
  size?: number;
  /** Tints the petals/bud so a subject-coloured screen can own its blooms. Defaults to brand pink. */
  tint?: string;
  /** Draws a soft circular well behind the flower, for grid tiles. Omit for a flower on open ground. */
  backgroundColor?: string;
  /** Overrides the spoken label. Defaults to the stage phrase (+ watering). */
  accessibilityLabel?: string;
  /** Hide from the reading order when a neighbouring label already speaks the same thing. */
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SkillBloom: React.FC<SkillBloomProps> = ({
  stage,
  thirsty = false,
  size = 64,
  tint = colors.primary,
  backgroundColor,
  accessibilityLabel,
  decorative = false,
  style,
}) => {
  const spoken = accessibilityLabel ?? bloomStageLabel(stage, thirsty);
  const a11y = decorative
    ? ({
        accessible: false,
        importantForAccessibility: 'no-hide-descendants',
        accessibilityElementsHidden: true,
      } as const)
    : ({
        accessible: true,
        accessibilityRole: 'image',
        accessibilityLabel: spoken,
      } as const);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? colors.transparent,
        },
        style,
      ]}
      {...a11y}
    >
      {/*
        The flower is painted artwork now, so `tint` no longer colours it — the
        subject's colour is carried by the planter bed and soil behind the strip
        instead. The thirsty droplet stays drawn, so it can still sit on top of
        whichever stage is showing.
      */}
      <Image
        source={BLOOM_IMAGES[stage]}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      {thirsty ? (
        <Svg width={size} height={size} viewBox="0 0 48 48" style={StyleSheet.absoluteFill}>
          {thirstyDrop()}
        </Svg>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // A bloom is a fixed shape; never let a long label beside it squeeze the glyph.
    flexShrink: 0,
    flexGrow: 0,
  },
});

export default SkillBloom;
