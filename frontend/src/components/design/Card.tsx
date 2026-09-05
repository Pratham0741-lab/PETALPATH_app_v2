import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadows, cardSizes } from '../../theme';
import { useScreenAccent, mixWhite, PANEL_ALPHA } from './screenAccent';

/**
 * Card — the surface every piece of content sits on (spec §5, §28).
 *
 * White or warm-white, 22px radius, one hairline border, one soft shadow,
 * generous padding. Deliberately the only card in the design system so the
 * whole app shares a single surface treatment rather than each screen
 * inventing its own.
 */

export type CardVariant =
  /** Default: white + border + soft shadow. */
  | 'raised'
  /** Border only, no shadow — for cards nested inside another card. */
  | 'flat'
  /** Coloured 2px border, used for the selected item in a list. */
  | 'selected'
  /** Warm tint, used for muted/locked content. */
  | 'muted';

export type CardPadding = 'none' | 'compact' | 'normal' | 'roomy';

const PADDING: Record<CardPadding, number> = {
  none: 0,
  compact: cardSizes.paddingCompact,
  normal: cardSizes.padding,
  roomy: cardSizes.paddingRoomy,
};

/**
 * Style properties that describe how the card sits *in its parent* rather than
 * how it is painted. When the card is interactive these have to be applied to
 * the outer animated wrapper, because that — not the Pressable — is the box the
 * parent actually lays out.
 *
 * Getting this wrong collapsed the Mentors grid. `MentorContent` renders its
 * buddies into a `flexWrap: 'wrap'` row and passes each card
 * `{ flexGrow: 1, flexShrink: 1, flexBasis: 260 }`. That landed on the inner
 * Pressable, so the wrapper the row was measuring had `flexBasis: auto` and
 * Yoga had no width to wrap on: all five cards stayed on one line and were
 * squeezed to about 40px each. Worse, the wrapper is a *column*, so the inner
 * Pressable read `flexBasis: 260` as a 260px **height** request — the sizing was
 * not just ignored, it was applied to the wrong axis.
 *
 * The same silent failure hit the Rewards grid, the Camera explorer grid,
 * `ParentSection`'s tiles and Home's `pairItem` pair. `ParentDashboardScreen`
 * had already been worked around by hand with an extra wrapping `View`; that
 * workaround is now unnecessary but harmless.
 *
 * Everything not listed here stays on the Pressable, which is what paints the
 * surface: `backgroundColor`, `border*`, `borderRadius`, `padding*`, `gap`,
 * `overflow`, `opacity`, `alignItems`, `transform`. Callers rely on those —
 * `HintCard` tints its background, `ReadingScreen` clips an image with
 * `overflow: 'hidden'`, the Journey carousel cards set their own border — so
 * hoisting the whole `style` wholesale would have broken them.
 */
const OUTER_KEYS = new Set<string>([
  'flex',
  'flexBasis',
  'flexGrow',
  'flexShrink',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'aspectRatio',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'start',
  'end',
  'zIndex',
]);

/**
 * Flattens a caller's style and splits it into the part that belongs on the
 * outer wrapper and the part that belongs on the surface. Flattening first is
 * what makes this work for the array-and-conditional styles callers pass, e.g.
 * `[styles.card, isCompleted && styles.done]`.
 */
const splitLayout = (
  style: StyleProp<ViewStyle>
): { outer: ViewStyle | undefined; inner: ViewStyle | undefined } => {
  const flat = StyleSheet.flatten(style);
  if (!flat) return { outer: undefined, inner: undefined };

  /* Indexing a ViewStyle by a computed string is not expressible in the type
     system without narrowing every key, so the copy is done on plain records
     and cast back once. The values are moved untouched. */
  const source = flat as unknown as Record<string, unknown>;
  const outerObj: Record<string, unknown> = {};
  const innerObj: Record<string, unknown> = {};
  let hasOuter = false;
  let hasInner = false;

  for (const key of Object.keys(source)) {
    if (source[key] === undefined) continue;
    if (OUTER_KEYS.has(key)) {
      outerObj[key] = source[key];
      hasOuter = true;
    } else {
      innerObj[key] = source[key];
      hasInner = true;
    }
  }

  return {
    outer: hasOuter ? (outerObj as ViewStyle) : undefined,
    inner: hasInner ? (innerObj as ViewStyle) : undefined,
  };
};

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  /** Accent colour for `selected`, and for the optional left rail. */
  accent?: string;
  /**
   * Draws a 6px colour rail down the leading edge — how a card signals which
   * activity type or subject it belongs to without relying on colour alone.
   */
  rail?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /**
   * Styles the card. Sizing and positioning (`flex*`, `width`, `height`,
   * `margin*`, `position`, `alignSelf`) are applied to the outermost box so
   * they work the same whether or not the card is pressable — see `OUTER_KEYS`.
   * Everything else paints the surface.
   */
  style?: StyleProp<ViewStyle>;
  /** Applied to the inner padded view — useful for row layouts. */
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'summary' | 'none';
  testID?: string;
}

/**
 * Colour mixing lives in `screenAccent` so the card, the roadmap and anything
 * else that tints to the screen stay in step by construction.
 */

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'raised',
  padding = 'normal',
  accent,
  rail = false,
  onPress,
  onLongPress,
  disabled = false,
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  testID,
}) => {
  const interactive = !!onPress && !disabled;
  // Rail / selected-border colour: an explicit `accent` wins; otherwise the
  // screen's accent (so a screen's card rails share its colour identity).
  const screenAccent = useScreenAccent();
  const accentColor = accent ?? screenAccent;
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (v: number) => {
    if (!interactive) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  /**
   * Cards take a soft tint of the screen's accent so the boxes visibly match the
   * screen's background aesthetic (a light blue card on Home, light yellow on
   * Rewards, light lavender on Profile, …) rather than reading as stark white.
   * The tint is a light mix of the accent into white, kept pale so dark text
   * stays crisp. Screens with no per‑screen accent (the default brand pink) keep
   * an ordinary warm‑white card, so only the themed tab screens get the wash.
   */
  const themed = screenAccent !== colors.primary;
  /*
   * Panels are translucent so the wallpaper reads through them and the screen
   * feels like one composition rather than cards stacked on a picture. The hue is
   * only a whisper of the screen's accent — the transparency, not the tint, is
   * what ties the panel to the scene. `PANEL_ALPHA` is the floor that keeps dark
   * text legible over every wallpaper; the border stays near-opaque so the edge
   * of the panel never dissolves.
   */
  const tintFill = mixWhite(screenAccent, 0.07, PANEL_ALPHA);
  const tintBorder = mixWhite(screenAccent, 0.28, 0.9);
  const cardFill = themed ? tintFill : `rgba(255, 255, 255, ${PANEL_ALPHA})`;
  const cardBorder = themed ? tintBorder : colors.border;
  const surface: ViewStyle =
    variant === 'muted'
      ? { backgroundColor: `rgba(255, 253, 252, ${PANEL_ALPHA - 0.06})`, borderColor: colors.border, borderWidth: 1 }
      : variant === 'selected'
      ? { backgroundColor: cardFill, borderColor: accentColor, borderWidth: 2 }
      : variant === 'flat'
      ? { backgroundColor: cardFill, borderColor: cardBorder, borderWidth: 1 }
      : { backgroundColor: cardFill, borderColor: cardBorder, borderWidth: 1 };

  const body = (
    <View style={styles.row}>
      {rail ? <View style={[styles.rail, { backgroundColor: accentColor }]} /> : null}
      <View style={[styles.content, { padding: PADDING[padding] }, contentStyle]}>{children}</View>
    </View>
  );

  if (!interactive) {
    /* One node, so the caller's style needs no splitting — layout and surface
       both belong here. */
    return (
      <View
        style={[
          styles.card,
          surface,
          variant === 'flat' ? null : shadows.sticker,
          disabled && styles.disabled,
          style,
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        testID={testID}
      >
        {body}
      </View>
    );
  }

  const { outer, inner } = splitLayout(style);

  return (
    /* `outer` comes last so a caller that sets its own `alignSelf` overrides the
       stretch default rather than fighting it. */
    <Animated.View style={[{ transform: [{ scale }] }, styles.animatedWrap, outer]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => animate(0.98)}
        onPressOut={() => animate(1)}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
        style={({ pressed }) => [
          styles.card,
          /* Fill the wrapper now that the wrapper is the sized box. With an
             auto-height wrapper this is a no-op; when the wrapper has a real
             height — a hoisted `height`, or `alignSelf: 'stretch'` in a card
             grid — it makes the painted surface cover it instead of stopping at
             the content. That is what gives the mentor and rewards grids
             equal-height rows. */
          styles.fill,
          surface,
          variant === 'flat' ? null : shadows.sticker,
          disabled && styles.disabled,
          inner,
          pressed && styles.pressed,
        ]}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    // `hidden` lets the colour rail follow the rounded corner.
    overflow: 'hidden',
  },
  animatedWrap: {
    alignSelf: 'stretch',
  },
  fill: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rail: {
    width: 6,
  },
  content: {
    flex: 1,
  },
  pressed: {
    // Shadow is animated away on press so the card reads as pushed in.
    shadowOpacity: 0.02,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default Card;
