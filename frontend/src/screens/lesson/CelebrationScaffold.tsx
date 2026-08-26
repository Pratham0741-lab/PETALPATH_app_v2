/**
 * CelebrationScaffold — the shared layout behind the three "you finished
 * something" screens: Lesson Completed (reference screen 11), Module Completed
 * and Category Completed (spec §34 phase 6).
 *
 * All three previously repeated the same markup with slightly different numbers
 * baked in: a tinted circle around one icon, a big title, a supporting line, an
 * optional highlight card and a stack of full-width buttons. The circles were
 * 100px, 110px and 160px, the titles 32px, `largeTitle` and `largeTitle`, and
 * two of the three hardcoded `rgba(247, 201, 75, …)` for the same wash. Pulling
 * the layout here removes that drift (§28) and means the three screens read as
 * one moment in the app rather than three near-misses.
 *
 * It deliberately owns no data. Each screen keeps its own stores, navigation and
 * completion logic and passes finished nodes in.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography, layoutSizes, illustrationSizes } from '../../theme';
import { AppShell, IconWell, Illustration } from '../../components/design';
import type { PetalIconName } from '../../components/icons';

/**
 * Party bunting strung across the top of the screen.
 *
 * The reference design opens every completion screen with this, and it earns its
 * place: a celebration screen has to feel unlike the four working screens that
 * led to it, and until now the only difference was the size of the type. Bunting
 * says "party" before a child has read anything.
 *
 * Drawn rather than shipped as an image so it takes the real screen width at any
 * size and costs nothing to bundle. The string is one quadratic curve with the
 * flags hung from points sampled along it, so the sag is genuine rather than a
 * row of triangles pretending to hang.
 */
const BUNTING_HEIGHT = 52;
/** How far the string dips at its middle. */
const BUNTING_SAG = 16;
const BUNTING_FLAG_HEIGHT = 26;
const BUNTING_COLORS = [
  colors.primary,
  colors.yellow,
  colors.secondary,
  colors.green,
  colors.blue,
];

const Bunting: React.FC<{ width: number }> = ({ width }) => {
  /* One flag per ~40px, so a 360px phone gets nine and a tablet does not end up
     with nine enormous ones. */
  const flags = Math.max(5, Math.min(13, Math.round(width / 40)));
  const y0 = 3;
  /* The control point of a quadratic sits at twice the visual dip, because the
     curve only reaches halfway towards it. */
  const cy = y0 + BUNTING_SAG * 2;
  const spacing_ = width / flags;
  const flagWidth = spacing_ * 0.66;

  return (
    <Svg width={width} height={BUNTING_HEIGHT} pointerEvents="none">
      <Path
        d={`M 0 ${y0} Q ${width / 2} ${cy}, ${width} ${y0}`}
        stroke={colors.brown}
        strokeOpacity={0.35}
        strokeWidth={2}
        fill="none"
      />
      {Array.from({ length: flags }, (_, i) => {
        const t = (i + 0.5) / flags;
        const u = 1 - t;
        // The point on the string this flag hangs from.
        const x = 2 * u * t * (width / 2) + t * t * width;
        const y = u * u * y0 + 2 * u * t * cy + t * t * y0;
        const half = flagWidth / 2;
        return (
          <Path
            key={i}
            d={`M ${x - half} ${y} L ${x + half} ${y} L ${x} ${y + BUNTING_FLAG_HEIGHT} Z`}
            fill={BUNTING_COLORS[i % BUNTING_COLORS.length]}
            fillOpacity={0.9}
          />
        );
      })}
    </Svg>
  );
};

export interface CelebrationScaffoldProps {
  /** Hero glyph — `star` for a lesson, `medal` for a module, `trophy` for a category. */
  icon: PetalIconName;
  iconColor: string;
  iconSoft: string;
  /** Diameter of the hero well. Defaults to 96, which fits a 360px screen. */
  iconSize?: number;
  /**
   * The reaction, not the status — "Amazing!", "Superstar!". One or two words,
   * set at `hero`.
   *
   * These used to read "Lesson Completed!" / "Module Completed!", which is a
   * receipt: it restates in a headline what `message` says properly in a sentence
   * ("You finished all the activities in …"). A five-year-old who has just worked
   * through four activities should be met with a reaction. Keep it under about 12
   * characters or it wraps to two lines at this size.
   */
  title: string;
  /** One warm sentence naming what was finished. Carries the actual detail. */
  message: string;
  /*
   * There is deliberately no `reward` prop here, and it is worth recording why so
   * the next pass does not "finish the job".
   *
   * The reference design puts a "+10 Petal Points" pill under the message, and it
   * was built and then removed: nothing in this app produces that number.
   * `completionResult` carries `starsEarned`, `totalStars`, `moduleCompleted` and
   * `categoryCompleted` and no points field, and `RewardBadge kind="petals"` has
   * zero call sites anywhere — Petals exist as a badge variant and as decorative
   * blossom, not as a currency the child accumulates. A hardcoded "+10" on a
   * screen a parent also reads is a number the product would then have to honour.
   *
   * Adding it needs a points field on the completion payload first. Until then the
   * stars card each screen already renders is the honest reward display.
   */
  /** Cards shown under the hero — stars earned, a new badge, the next module. */
  children?: React.ReactNode;
  /** Sticky action row, so the primary button never needs scrolling to reach. */
  footer?: React.ReactNode;
  /**
   * Rendered as a sibling of the shell rather than inside it. `NavigationGuide`
   * positions itself absolutely, and from inside the ScrollView it would anchor
   * to the scrolled content instead of the screen.
   */
  overlay?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const CelebrationScaffold: React.FC<CelebrationScaffoldProps> = ({
  icon,
  iconColor,
  iconSoft,
  iconSize = 96,
  title,
  message,
  children,
  footer,
  overlay,
  style,
  testID,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, style]} testID={testID}>
      <AppShell contentContainerStyle={styles.scrollBody} footer={footer}>
        <View style={styles.readable}>
          <View style={styles.hero}>
            {/*
              * The star character from the reference, once there is artwork for
              * it. Until then this renders the `IconWell` these screens have
              * always shown — identical pixels today, a mascot the day a file
              * lands in `assets/illustrations`.
              *
              * `decorative`, because the headline directly under it is already an
              * `accessibilityRole="header"` announcing the same thing. A star
              * with a face adds delight for a child who can see it and nothing
              * but a repeat for a child listening.
              */}
            <Illustration
              name="celebrate"
              size={illustrationSizes.md}
              decorative
              fallback={
                <IconWell icon={icon} color={iconColor} soft={iconSoft} filled size={iconSize} />
              }
            />


            <Text style={[typography.presets.hero, styles.title]} accessibilityRole="header">
              {title}
            </Text>

            <Text style={[typography.presets.subtle, styles.message]}>{message}</Text>
          </View>

          {children}
        </View>
      </AppShell>

      {/*
        * Painted over the shell rather than inside it, for two reasons: the
        * scroll body is vertically centred, so bunting in the content flow would
        * float halfway down a tall screen instead of hanging from the top; and
        * the shell applies its own gutter, which would leave a gap at each end of
        * the string. Offset by the safe-area inset so it clears the status bar.
        */}
      <View
        style={[styles.bunting, { top: insets.top }]}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        <Bunting width={width} />
      </View>

      {overlay}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  /**
   * Centres a short celebration in a tall window but still scrolls once the text
   * wraps on a 360px screen — `flexGrow` rather than `flex`, or the content
   * would be clamped to the viewport and clipped (§27).
   */
  scrollBody: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  readable: {
    width: '100%',
    maxWidth: layoutSizes.dialog,
    alignSelf: 'center',
    gap: spacing.lg,
    /* Clears the bunting. Needed for the case where the content is taller than
       the window: `scrollBody` centres a short celebration, but once it scrolls
       the hero starts at the top and would sit behind the flags. On a tall screen
       this just nudges the centred block down, which suits bunting above it. */
    paddingTop: BUNTING_HEIGHT + spacing.sm,
    paddingBottom: spacing.lg,
  },
  bunting: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  /**
   * The one place in the app that uses `hero`, and the reason the preset exists.
   * At `title` (24px) the headline was the same size as a card heading, so the
   * biggest thing on a screen whose entire job is "you did it" was a 96px icon
   * with a caption under it.
   *
   * Purple rather than ink or the achievement's own colour: the brief reserves
   * purple for progress, and finishing something is the strongest progress signal
   * in the product. `iconColor` was the tempting choice — it would tie the
   * headline to the medal — but two of the three are yellow, and yellow type on
   * white is about 1.7:1 against a 4.5 requirement.
   */
  title: {
    color: colors.secondaryDark,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default CelebrationScaffold;
