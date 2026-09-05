import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { colors } from '../../theme';
import { AVATAR_IMAGES } from '../../assets/characters';

/**
 * AvatarGlyph (spec §7, §8).
 *
 * Flat SVG animal faces used wherever the app previously rendered an emoji as
 * a child avatar or mentor portrait. `assets/illustrations` is empty, so these
 * are authored here in one coherent style: circular head, flat fills from the
 * palette, no outlines, no gradients.
 */

export type AvatarSpecies = 'panda' | 'bunny' | 'cat' | 'fox' | 'tiger' | 'bear' | 'flower';

const SPECIES: AvatarSpecies[] = ['panda', 'bunny', 'cat', 'fox', 'tiger', 'bear', 'flower'];

/** Accepts `avatar_panda`, `panda`, `PANDA`, `rabbit`, a mentor characterType… */
export const resolveSpecies = (raw?: string | null): AvatarSpecies => {
  const s = (raw ?? '').toLowerCase();
  if (!s) return 'flower';
  if (s.includes('rabbit') || s.includes('bunny') || s.includes('hare')) return 'bunny';
  const hit = SPECIES.find((k) => s.includes(k));
  return hit ?? 'flower';
};

/** Warm background wash behind each face. */
export const speciesBackground = (species: AvatarSpecies): string => {
  switch (species) {
    case 'panda':
      return '#EFEFF3';
    case 'bunny':
      return colors.yellowSoft;
    case 'cat':
      return colors.primaryLight;
    case 'fox':
      return colors.warningLight;
    case 'tiger':
      return '#FDE6D2';
    case 'bear':
      return colors.peach;
    default:
      return colors.greenSoft;
  }
};

const INK = '#3A322F';
const CREAM = '#FDF6EF';

const FACES: Record<AvatarSpecies, React.ReactNode> = {
  panda: (
    <G>
      <Circle cx={12} cy={13} r={7} fill={INK} />
      <Circle cx={36} cy={13} r={7} fill={INK} />
      <Circle cx={24} cy={26} r={16} fill={CREAM} />
      {/*
        * Eye patches at rx 4 / ry 4.8, not the 5 / 6 they were drawn at.
        * The panda is the only species with a large block of ink inside the head
        * as well as on the ears, and at the 30px this renders at in the Home
        * header the two patches plus the ears merged into one dark shape — the
        * face stopped being a face. Trimming the patches ~35% and opening the
        * pupils keeps the ratio that says "panda" while letting the cream head
        * read at small sizes. Anything below about 26px is still too small for
        * any of these faces; see `AvatarGlyphProps.size`.
        */}
      <Ellipse cx={17.5} cy={24} rx={4} ry={4.8} fill={INK} />
      <Ellipse cx={30.5} cy={24} rx={4} ry={4.8} fill={INK} />
      <Circle cx={17.5} cy={23.5} r={2} fill={CREAM} />
      <Circle cx={30.5} cy={23.5} r={2} fill={CREAM} />
      <Ellipse cx={24} cy={31} rx={3} ry={2.2} fill={INK} />
      <Path d="M20 35 Q24 38 28 35" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </G>
  ),
  bunny: (
    <G>
      <Ellipse cx={17} cy={9} rx={4.5} ry={9} fill={CREAM} />
      <Ellipse cx={31} cy={9} rx={4.5} ry={9} fill={CREAM} />
      <Ellipse cx={17} cy={9} rx={2} ry={6} fill={colors.pinkSoft} />
      <Ellipse cx={31} cy={9} rx={2} ry={6} fill={colors.pinkSoft} />
      <Circle cx={24} cy={27} r={15} fill={CREAM} />
      <Circle cx={18.5} cy={25} r={2.3} fill={INK} />
      <Circle cx={29.5} cy={25} r={2.3} fill={INK} />
      <Path d="M21.5 31 L26.5 31 L24 34 Z" fill={colors.primary} />
      <Path d="M24 34 L24 36" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M18 37 Q24 40 30 37" stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  ),
  cat: (
    <G>
      <Path d="M11 18 L13 5 L23 13 Z" fill="#F3A66E" />
      <Path d="M37 18 L35 5 L25 13 Z" fill="#F3A66E" />
      <Circle cx={24} cy={26} r={16} fill="#F7BC8B" />
      <Ellipse cx={18} cy={24} rx={2.2} ry={3} fill={INK} />
      <Ellipse cx={30} cy={24} rx={2.2} ry={3} fill={INK} />
      <Path d="M21.5 30 L26.5 30 L24 32.6 Z" fill={colors.primary} />
      <Path d="M8 27 L15 28.5 M8 32 L15 31" stroke={CREAM} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M40 27 L33 28.5 M40 32 L33 31" stroke={CREAM} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M20 35 Q24 37.5 28 35" stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  ),
  fox: (
    <G>
      <Path d="M10 17 L12 4 L23 12 Z" fill="#C96A2E" />
      <Path d="M38 17 L36 4 L25 12 Z" fill="#C96A2E" />
      <Circle cx={24} cy={25} r={16} fill="#E8823A" />
      <Path d="M24 41 C15 39 12 32 13 27 C17 30 20 31 24 31 C28 31 31 30 35 27 C36 32 33 39 24 41 Z" fill={CREAM} />
      <Circle cx={18} cy={23} r={2.3} fill={INK} />
      <Circle cx={30} cy={23} r={2.3} fill={INK} />
      <Ellipse cx={24} cy={33} rx={2.8} ry={2.1} fill={INK} />
    </G>
  ),
  tiger: (
    <G>
      <Circle cx={12} cy={15} r={6} fill="#E8A33A" />
      <Circle cx={36} cy={15} r={6} fill="#E8A33A" />
      <Circle cx={24} cy={26} r={16} fill="#F5BF52" />
      <Path
        d="M17 13 L15 19 M24 11 L24 17 M31 13 L33 19"
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Ellipse cx={24} cy={33} rx={8} ry={6} fill={CREAM} />
      <Circle cx={18.5} cy={24} r={2.3} fill={INK} />
      <Circle cx={29.5} cy={24} r={2.3} fill={INK} />
      <Ellipse cx={24} cy={30.5} rx={2.8} ry={2} fill={colors.primary} />
      <Path d="M24 33 L24 35 M24 35 Q21 37 19.5 35 M24 35 Q27 37 28.5 35" stroke={INK} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),
  bear: (
    <G>
      <Circle cx={12} cy={14} r={6.5} fill="#8A6350" />
      <Circle cx={36} cy={14} r={6.5} fill="#8A6350" />
      <Circle cx={12} cy={14} r={3} fill={colors.peach} />
      <Circle cx={36} cy={14} r={3} fill={colors.peach} />
      <Circle cx={24} cy={26} r={16} fill="#A87A63" />
      <Ellipse cx={24} cy={33} rx={8.5} ry={6.5} fill={colors.peach} />
      <Circle cx={18.5} cy={24} r={2.2} fill={INK} />
      <Circle cx={29.5} cy={24} r={2.2} fill={INK} />
      <Ellipse cx={24} cy={30.5} rx={3} ry={2.2} fill={INK} />
      <Path d="M20.5 35.5 Q24 38 27.5 35.5" stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  ),
  flower: (
    <G>
      {[0, 72, 144, 216, 288].map((deg) => (
        <Ellipse
          key={deg}
          cx={24}
          cy={13}
          rx={6}
          ry={9}
          fill={colors.pinkSoft}
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
      <Circle cx={24} cy={24} r={6.5} fill={colors.yellow} />
      <Circle cx={21.5} cy={23} r={1.3} fill={INK} />
      <Circle cx={26.5} cy={23} r={1.3} fill={INK} />
      <Path d="M21.5 26.5 Q24 28.5 26.5 26.5" stroke={INK} strokeWidth={1.3} strokeLinecap="round" fill="none" />
    </G>
  ),
};

export interface AvatarGlyphProps {
  /** Avatar id, species name, or mentor characterType. */
  species?: string | AvatarSpecies | null;
  /**
   * Diameter. Keep this at 32 or above: these faces carry pupils and mouths at
   * roughly 4% of the glyph, so below about 30px the small features drop out and
   * every species collapses toward a tinted circle with a dark mass in it. The
   * default of 44 matches `cardSizes.iconWellSmall`.
   */
  size?: number;
  /** Overrides the species' default background wash. */
  backgroundColor?: string;
  /** Draws a coloured ring — use for the selected mentor or active child. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const AvatarGlyph: React.FC<AvatarGlyphProps> = ({
  species,
  size = 44,
  backgroundColor,
  ringColor,
  style,
  accessibilityLabel,
}) => {
  const key = resolveSpecies(typeof species === 'string' ? species : undefined);
  const bg = backgroundColor ?? speciesBackground(key);
  const ring = ringColor ? 2.5 : 0;
  /*
   * The face is drawn inside a circular clip, so it has to clear a circle, not a
   * square — and the ring is drawn *inside* the box, shrinking that circle again.
   * Sizing the SVG to a flat 86% of the outer box ignored both. The bunny's ear
   * tips sit at (17, 0) and (31, 0) in the 48-unit viewBox, which is outside the
   * inscribed circle, so on a ringed avatar they landed exactly on the ring and
   * were shaved off — the clipped buddy faces on the Mentors screen.
   *
   * Measuring 88% of the *content* box instead gives the ears about 2px of
   * clearance at every size the app uses, from the 24px chip in `TopBar` to the
   * 88px portrait on the profile screens.
   */
  const inner = Math.max(1, Math.round((size - ring * 2) * 0.88));

  // Prefer the real uploaded avatar art when it exists; the drawn SVG face is the
  // fallback for any species without an image. The avatar PNGs are already round
  // busts, so they fill the circular frame; the SVG path keeps its 88% inset.
  const image = AVATAR_IMAGES[key];

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          /* Half the box, not `radius.pill`. A 9999 radius relies on the platform
             clamping it, and the clip that `overflow: 'hidden'` derives from it
             is what shapes the face. */
          borderRadius: size / 2,
          backgroundColor: image ? colors.surface : bg,
          borderWidth: ring,
          borderColor: ringColor ?? 'transparent',
        },
        style,
      ]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {image ? (
        <Image source={image} resizeMode="cover" style={styles.image} />
      ) : (
        <Svg width={inner} height={inner} viewBox="0 0 48 48">
          {FACES[key]}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    /* An avatar is a fixed circle: it must never be squeezed oval by a long name
       beside it. Several call sites were passing `flexShrink: 0` themselves to
       get this; the invariant belongs to the component. */
    flexShrink: 0,
    flexGrow: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default AvatarGlyph;
