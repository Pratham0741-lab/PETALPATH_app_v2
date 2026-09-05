import React from 'react';
import {
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  RefreshControlProps,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, spacing, bottomNavSizes } from '../../theme';
import { useTutorialStore } from '../../store/tutorialStore';
import { PetalBackground, PetalDensity } from './PetalBackground';
import { ScreenAccentProvider } from './screenAccent';

/**
 * AppShell — the single screen wrapper (spec §28).
 *
 * Handles safe areas, the warm background, the subtle petal layer, and the
 * bottom-navigation inset so content is never hidden behind the tab bar
 * (spec §9). Replaces the per-screen `ScreenContainer` + `ScrollView` +
 * hand-rolled `paddingBottom: 100` pattern.
 *
 * Keeps ScreenContainer's tutorial behaviour: any touch anywhere resets the
 * inactivity timer that drives the guidance hand.
 */
export interface AppShellProps {
  children: React.ReactNode;
  /** Render the content inside a ScrollView. Default true. */
  scroll?: boolean;
  /** Apply the standard horizontal gutter. Default true. */
  padded?: boolean;
  /**
   * Reserve room for the bottom tab bar. Turn off on stack screens that are
   * pushed over the tabs, or the padding is wasted space.
   */
  withBottomNav?: boolean;
  /** Petal decoration density (spec §4). */
  petals?: PetalDensity;
  /**
   * Pale blue wash behind the header, so the top of the screen has air.
   *
   * Only meaningful together with `scene`: once a screen has ground at the
   * bottom it needs sky at the top, or the composition is bottom-heavy and the
   * garden reads as an illustration stuck on rather than as the floor. On its own
   * this would just be a tinted header, which is why it is off by default.
   */
  sky?: boolean;
  /**
   * Ground for the screen to end on — pass a `SceneBand`.
   *
   * Rendered inside the scroll content, after `children`, but bled past the
   * horizontal gutter so it runs edge to edge. The bottom-nav inset moves below
   * it and is painted in the band's own grass colour, so the ground continues
   * behind the tab bar instead of stopping short with a strip of background
   * underneath it.
   */
  scene?: React.ReactNode;
  /**
   * A full‑screen illustrated background drawn behind everything (cover‑fit).
   * Use the calm‑centred wallpapers in `assets/backgrounds`; pair with
   * `petals="none"` so the petal layer doesn't sit on top of the scene.
   */
  backgroundImage?: ImageSourcePropType;
  /**
   * Opacity (0–1) of a soft white veil laid over `backgroundImage`, so a detailed
   * scene reads gently and text/cards on top stay crisp. Only applies when a
   * `backgroundImage` is set. Default 0.28.
   */
  backgroundVeil?: number;
  /**
   * Opacity (0–1) of `backgroundImage`. Defaults to 1 — the artwork is shown at
   * its own full brightness, and it is the translucency of the cards and the tab
   * bar (not a faded wallpaper) that keeps content the centre of attention. Drop
   * it only for a screen that needs an unusually quiet backdrop.
   */
  backgroundOpacity?: number;
  /**
   * Per‑screen accent colour (matched to the scene). Published via context so
   * accent‑bearing components (card rails, icon wells, chips, progress bars,
   * secondary buttons) tint to it by default. Primary CTA buttons stay pink.
   */
  accent?: string;
  /** Pinned above the scroll area — headers belong here. */
  header?: React.ReactNode;
  /**
   * Scroll the header away with the content instead of pinning it. For screens
   * whose header is a greeting rather than a control surface: it introduces the
   * page, so once the child is reading further down it is just taking up room.
   * The header keeps its own horizontal inset, so it still lines up with the
   * cards below it.
   */
  headerScrolls?: boolean;
  /** Pinned to the bottom, above the tab bar — for a sticky primary CTA. */
  footer?: React.ReactNode;
  /**
   * Lift the content clear of the on-screen keyboard. Turn this on for screens
   * with a text field near the bottom (the child form, sign-in). Matches the
   * old `Screen` component's behaviour: iOS gets `padding`, Android relies on
   * its own `adjustResize` windowing.
   */
  keyboardAvoid?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Gives the screen access to the scroll view, e.g. to auto-scroll to a node. */
  scrollRef?: React.RefObject<ScrollView | null>;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Overrides the default top+bottom safe-area edges. */
  edges?: Edge[];
  testID?: string;
}

const GUTTER = spacing.lg; // 16

/**
 * Height of the sky wash. Deep enough to clear a tall header, shallow enough
 * that it never reads as a coloured header bar.
 */
const SKY_HEIGHT = 150;

export const AppShell: React.FC<AppShellProps> = ({
  children,
  scroll = true,
  padded = true,
  withBottomNav = false,
  petals = 'normal',
  sky = false,
  scene,
  backgroundImage,
  backgroundVeil = 0,
  backgroundOpacity = 1,
  accent,
  header,
  headerScrolls = false,
  footer,
  keyboardAvoid = false,
  refreshControl,
  scrollRef,
  onScroll,
  scrollEventThrottle = 16,
  backgroundColor = colors.background,
  style,
  contentContainerStyle,
  edges,
  testID,
}) => {
  const resolvedEdges: Edge[] = edges ?? ['top', 'bottom'];
  /** Exact screen size, so the background image box can never be stretched. */
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  /** Room below the content: reserved by the scene wrapper when there is one. */
  const tailInset = withBottomNav ? bottomNavSizes.contentInset : spacing.xl;

  const contentPadding: ViewStyle = {
    paddingHorizontal: padded ? GUTTER : 0,
    paddingBottom: scene ? 0 : tailInset,
  };

  const sceneTail = scene ? (
    <View style={padded ? styles.sceneBleed : undefined}>
      {scene}
      {/* Continues the grass down behind the tab bar. Without this the band
          would stop and leave a strip of plain background under it. */}
      <View style={[styles.sceneFiller, { height: tailInset }]} />
    </View>
  ) : null;

  /*
   * The header, moved inside the scroll content. The negative margin cancels the
   * content gutter so the header keeps the inset it defines for itself rather
   * than being indented twice.
   */
  const inlineHeader =
    headerScrolls && header ? (
      <View style={padded ? styles.headerBleed : undefined}>{header}</View>
    ) : null;

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentContainerStyle={[contentPadding, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      refreshControl={refreshControl}
    >
      {inlineHeader}
      {children}
      {sceneTail}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentPadding, contentContainerStyle]}>{children}</View>
  );

  const frame = (
    <View
      style={styles.flex}
      onTouchStart={() => useTutorialStore.getState().recordInteraction()}
    >
      {headerScrolls ? null : header}
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    // Full‑bleed wrapper: the background image fills the entire screen (behind the
    // status bar and home indicator), and the SafeAreaView on top is transparent
    // so content still respects the insets. Previously the image lived *inside*
    // the padded SafeAreaView, so it stopped at the inset edges and read as cropped.
    <ScreenAccentProvider accent={accent}>
    <View style={[styles.root, { backgroundColor }, style]}>
      {backgroundImage ? (
        // The whole illustration at its natural proportions — never zoomed or
        // cropped. `contain` fits the entire image inside the screen; any leftover
        // strip on a taller phone shows the shell's background colour.
        <Image
          source={backgroundImage}
          /*
           * `stretch`, not `cover`/`contain`: the whole illustration is shown —
           * nothing is cropped off the top, bottom or sides — and it is stretched
           * on the vertical axis to meet the screen's height. The scenes are drawn
           * 9:16 while phones are taller, so this trades a little vertical
           * elongation (invisible on soft painted scenery) for a background that
           * fills the screen edge to edge with no bare strip.
           *
           * Sized in exact pixels, never `absoluteFill`/percentages: those resolve
           * against whatever the parent measures, which previously let the image
           * grow to the scroll content's height and render hugely zoomed.
           *
           * `opacity` is what keeps the scene ambient: it blends the art toward
           * the warm shell background so the wallpaper reads as a soft wash and
           * the cards on top stay the centre of attention.
           */
          resizeMode="stretch"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: windowWidth,
            height: windowHeight,
            opacity: backgroundOpacity,
          }}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      {backgroundImage && backgroundVeil > 0 ? (
        // Soft white veil so a detailed scene reads gently and content stays crisp.
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${backgroundVeil})` }]}
        />
      ) : null}
      <SafeAreaView style={styles.flex} edges={resolvedEdges} testID={testID}>
      {sky ? (
        <View
          style={styles.sky}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Svg width="100%" height={SKY_HEIGHT}>
            <Defs>
              <LinearGradient id="petalSky" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.sky} stopOpacity={1} />
                <Stop offset="1" stopColor={colors.sky} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={SKY_HEIGHT} fill="url(#petalSky)" />
          </Svg>
        </View>
      ) : null}
      <PetalBackground density={petals} />
      {keyboardAvoid ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {frame}
        </KeyboardAvoidingView>
      ) : (
        frame
      )}
      </SafeAreaView>
    </View>
    </ScreenAccentProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SKY_HEIGHT,
  },
  headerBleed: {
    /* Cancels the content gutter so the inline header keeps its own inset. */
    marginHorizontal: -GUTTER,
  },
  sceneBleed: {
    /* Cancels the content gutter so the ground runs edge to edge. */
    marginHorizontal: -GUTTER,
  },
  sceneFiller: {
    backgroundColor: colors.meadow,
  },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    /*
     * No fill and no rule. The sticky actions float directly on the screen's
     * scene: the buttons are solid shapes in their own right, so a strip behind
     * them added nothing but a hard white band cutting across the artwork —
     * most obviously on the activity screens, where it sat right under the scene.
     */
    backgroundColor: 'transparent',
  },
});

export default AppShell;
