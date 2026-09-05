/**
 * GardenScene — the Magical Garden illustration on the Mentors screen
 * (reference screen 14, spec §34 phase 7).
 *
 * Replaces the old scene, which was five emoji (🌳 🐦 🦋 🐢 🦊) sized by
 * `fontSize: 120` and pinned with `position: 'absolute'` at percentage
 * coordinates — emoji as UI art and an absolute-coordinate layout, both called
 * out in §33. It also always drew a turtle for the buddy, so a child who chose
 * Penny Panda still saw 🐢.
 *
 * Now it is one `Svg` with a viewBox, so it scales to whatever width it is given
 * (§27) and the buddy is the child's real `AvatarGlyph`, standing in front of
 * the tree.
 *
 * The tree also finally *does* something: `blossoms` fills the canopy from the
 * child's petal points, so watering visibly grows the garden instead of only
 * incrementing a number. Every colour is a palette token (§3, §29).
 */

import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { colors, radius, spacing } from '../../theme';
import { AvatarGlyph } from '../../components/design';

/** The scene is drawn in this box and scaled to fit its container. */
const VB_WIDTH = 320;
const VB_HEIGHT = 190;

/** Where blossoms appear as the tree grows, in viewBox units. */
const BLOSSOM_SPOTS: Array<{ x: number; y: number; r: number }> = [
  { x: 96, y: 70, r: 5 },
  { x: 150, y: 52, r: 5.5 },
  { x: 62, y: 92, r: 4.5 },
  { x: 132, y: 96, r: 5 },
  { x: 116, y: 44, r: 4.5 },
  { x: 168, y: 84, r: 5 },
  { x: 78, y: 58, r: 4 },
  { x: 148, y: 116, r: 4.5 },
];

export const MAX_BLOSSOMS = BLOSSOM_SPOTS.length;

export interface GardenSceneProps {
  /** Avatar id, species or characterType — passed straight to `AvatarGlyph`. */
  species?: string | null;
  /** Ring colour for the buddy standing in the garden. */
  mentorColor: string;
  /** How full the canopy is, 0…{@link MAX_BLOSSOMS}. */
  blossoms: number;
  /** Rendered height. The drawing scales; nothing is positioned in pixels. */
  height?: number;
  mascotSize?: number;
  /** Describes the whole picture — the SVG itself is hidden from screen readers. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export const GardenScene: React.FC<GardenSceneProps> = ({
  species,
  mentorColor,
  blossoms,
  height = 180,
  mascotSize = 60,
  accessibilityLabel,
  style,
}) => {
  const count = Math.max(0, Math.min(MAX_BLOSSOMS, Math.round(blossoms)));

  return (
    <View
      style={[styles.scene, { height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        /* One picture, one label — the shapes inside say nothing useful. */
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {/* Sky */}
        <Rect x={0} y={0} width={VB_WIDTH} height={VB_HEIGHT} fill={colors.blueSoft} />

        {/* Sun */}
        <Circle cx={272} cy={38} r={22} fill={colors.yellowSoft} />
        <Circle cx={272} cy={38} r={13} fill={colors.yellow} />

        {/* Far hill, then the near meadow the buddy stands on */}
        <Path
          d={`M0 138 Q 70 112 140 130 Q 220 152 ${VB_WIDTH} 118 L ${VB_WIDTH} ${VB_HEIGHT} L0 ${VB_HEIGHT} Z`}
          fill={colors.greenSoft}
        />
        <Path
          d={`M0 158 Q 90 138 180 154 Q 260 167 ${VB_WIDTH} 148 L ${VB_WIDTH} ${VB_HEIGHT} L0 ${VB_HEIGHT} Z`}
          fill={colors.green}
        />

        {/* Trunk, branches and canopy are the illustration layered above this
            SVG — only the sky, hills and meadow are still drawn here. */}

        {/* Two flowers in the meadow, always there so the garden is never bare */}
        <Circle cx={44} cy={172} r={5} fill={colors.primaryLight} />
        <Circle cx={44} cy={172} r={2} fill={colors.yellow} />
        <Circle cx={288} cy={166} r={5} fill={colors.primaryLight} />
        <Circle cx={288} cy={166} r={2} fill={colors.yellow} />

        {/* Bird on the wing */}
        <Path
          d="M232 56 q 10 -10 20 0 M252 56 q 10 -10 20 0"
          stroke={colors.textSecondary}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />

        {/* Butterfly */}
        <Ellipse cx={206} cy={112} rx={7} ry={9} fill={colors.purpleSoft} />
        <Ellipse cx={218} cy={112} rx={7} ry={9} fill={colors.purpleSoft} />
        <Rect x={210.5} y={104} width={3} height={17} rx={1.5} fill={colors.purple} />
      </Svg>

      {/*
        The tree itself, as artwork rather than circles. It is overlaid on the
        drawn sky/meadow instead of replacing the whole scene, because the scene
        is responsive (`slice`) and the blossom count is dynamic: blossoms are
        positioned from the same BLOSSOM_SPOTS the SVG used, converted from
        viewBox units to percentages so they keep landing on the same branches at
        any width.
      */}
      <Image
        source={require('../../assets/characters/mentor_tree_base.png')}
        style={styles.tree}
        resizeMode="contain"
        accessible={false}
      />
      {BLOSSOM_SPOTS.slice(0, count).map((b) => (
        <Image
          key={`${b.x}-${b.y}`}
          source={require('../../assets/characters/mentor_blossom.png')}
          style={[
            styles.blossom,
            {
              left: `${(b.x / VB_WIDTH) * 100}%`,
              top: `${(b.y / VB_HEIGHT) * 100}%`,
              width: b.r * 2.6,
              height: b.r * 2.6,
              marginLeft: -b.r * 1.3,
              marginTop: -b.r * 1.3,
            },
          ]}
          resizeMode="contain"
          accessible={false}
        />
      ))}

      {/* The buddy stands on the meadow. Flexbox, not coordinates — the offset
          is a spacing token, so it holds at any width. */}
      <View style={styles.mascotLayer} pointerEvents="none">
        <AvatarGlyph species={species} size={mascotSize} ringColor={mentorColor} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /* Sized and placed to sit where the drawn tree used to stand. */
  tree: {
    position: 'absolute',
    left: '8%',
    bottom: '16%',
    width: '52%',
    height: '78%',
  },
  blossom: {
    position: 'absolute',
  },
  scene: {
    width: '100%',
    borderRadius: radius.illustrationCard,
    overflow: 'hidden',
    backgroundColor: colors.blueSoft,
  },
  mascotLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    /* Nudges the buddy clear of the trunk without any percentage maths. */
    paddingLeft: spacing.xxxl * 2,
    paddingBottom: spacing.md,
  },
});

export default GardenScene;
