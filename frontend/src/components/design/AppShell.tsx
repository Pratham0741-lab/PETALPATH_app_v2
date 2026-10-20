import React, { useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { useWallpaperStore } from '../../store/wallpaperStore';
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
import { useDeviceType } from '../../hooks/useDeviceType';
import { PetalBackground, PetalDensity } from './PetalBackground';
import { ScreenAccentProvider } from './screenAccent';
import { coverFrame } from '../../utils/coverFrame';
import { backgroundFor } from '../../assets/backgrounds';
import { useSidebarWidth } from '../navigation/sidebarLayout';

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
   * Opacity (0–1) of a scrim laid over `backgroundImage`. Default 0.12.
   *
   * The scrim is a warm near-black, not white. Whitening was the wrong tool:
   * fading the art toward the pale shell colour and then laying white on top of
   * that made the screen *glow* — quieter in detail but brighter overall, which
   * is its own kind of distracting. Darkening a touch settles the scene behind
   * the content instead.
   */
  backgroundVeil?: number;
  /**
   * Opacity (0–1) of `backgroundImage`. Default 0.72.
   *
   * It used to be 1, on the theory that translucent cards were enough to keep
   * content in front. They are not: these wallpapers have flowers, butterflies,
   * trees and sparkles at full saturation, and for a two-to-six-year-old those
   * are not background — they are things to look at. The art still sets the mood
   * at this level; it just stops competing with the lesson.
   */
  backgroundOpacity?: number;
  /**
   * Blur radius applied to `backgroundImage`. Default 7.
   *
   * Enough to melt the flowers and butterflies into soft shapes; not so much
   * that the scene turns to fog and stops reading as a garden at all. Blurring
   * is what removes the *detail* a child's eye catches on while keeping the
   * colour and shape — dimming alone only makes the same details fainter.
   */
  backgroundBlur?: number;
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
 * Tablets get twice the phone gutter. At 16px a 10" screen's content runs to
 * the bezel and reads as a stretched phone; 32px gives the page a margin.
 */
const GUTTER_WIDE = spacing.xxl; // 32

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
  backgroundVeil = 0.12,
  backgroundOpacity = 0.72,
  backgroundBlur = 7,
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

  /*
   * Tablets and desktops navigate from the sidebar, so the room reserved for the
   * phone's floating tab bar would just be a blank strip under every screen.
   */
  const deviceType = useDeviceType();
  const wide = deviceType !== 'mobile';
  const gutter = wide ? GUTTER_WIDE : GUTTER;

  /*
   * Tablet wallpaper geometry.
   *
   * Sized from this screen's measured box, not the window: with edge-to-edge
   * on, Android's window height leaves out the gesture-bar area, so a
   * window-sized scene stopped short and left a pale strip across the bottom
   * of every tablet screen (on a phone the floating tab bar hides that band).
   *
   * And laid out as if it started at the window's left edge (shifted left by
   * the sidebar's width), so the full-window geometry matches the copy the
   * translucent sidebar draws behind itself — published below — and the two
   * meet without a seam.
   */
  const rail = useSidebarWidth(deviceType);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const bgWidth = wide && box ? box.w + rail : windowWidth;
  const bgHeight = wide && box ? box.h : windowHeight;
  const bgLeft = wide ? -rail : 0;
  const bgSource = backgroundFor(backgroundImage, !wide, windowWidth, windowHeight);

  // Tablets: tell the sidebar which scene the focused screen is showing.
  const navigation = useContext(NavigationContext);
  const setWallpaper = useWallpaperStore((st) => st.setWallpaper);
  useEffect(() => {
    if (!wide) return;
    const publish = () =>
      setWallpaper({
        source: bgSource,
        opacity: backgroundOpacity,
        blur: backgroundBlur,
        scrim: backgroundVeil,
        backgroundColor,
      });
    if (!navigation || navigation.isFocused()) publish();
    return navigation?.addListener('focus', publish);
  }, [wide, navigation, setWallpaper, bgSource, backgroundOpacity, backgroundBlur, backgroundVeil, backgroundColor]);
  /** Room below the content: reserved by the scene wrapper when there is one. */
  const tailInset = withBottomNav && !wide ? bottomNavSizes.contentInset : spacing.xl;

  const contentPadding: ViewStyle = {
    paddingHorizontal: padded ? gutter : 0,
    paddingBottom: scene ? 0 : tailInset,
  };

  const sceneTail = scene ? (
    <View style={padded ? { marginHorizontal: -gutter } : undefined}>
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
      <View style={padded ? { marginHorizontal: -gutter } : undefined}>{header}</View>
    ) : null;

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentContainerStyle={[contentPadding, wide && styles.readableWide, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      refreshControl={refreshControl}
      /*
       * Scrolling feel, set once here rather than per screen.
       *
       * `overScrollMode="never"` was the mistake. It kills Android's stretch at
       * the ends, so a list stops dead against an invisible wall — which reads
       * as stiff rather than as "no more content", and is most obvious on short
       * screens like Rewards where you hit both ends constantly. `"auto"` gives
       * the give back.
       *
       * `removeClippedSubviews` is also gone. It is a win for genuinely long
       * lists, but it detaches and reattaches native views as they cross the
       * viewport, and on a short grid of cards that bookkeeping costs more than
       * it saves — and on Android it is a known source of blank cells that pop
       * in mid-scroll. Nothing here is long enough to need it: the biggest
       * collection in the app is fifteen cards.
       */
      decelerationRate="normal"
      overScrollMode="auto"
      bounces
      contentInsetAdjustmentBehavior="automatic"
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
      {footer ? <View style={[styles.footer, { paddingHorizontal: gutter }]}>{footer}</View> : null}
    </View>
  );

  return (
    // Full‑bleed wrapper: the background image fills the entire screen (behind the
    // status bar and home indicator), and the SafeAreaView on top is transparent
    // so content still respects the insets. Previously the image lived *inside*
    // the padded SafeAreaView, so it stopped at the inset edges and read as cropped.
    <ScreenAccentProvider accent={accent}>
    <View
      style={[styles.root, wide && styles.rootWide, { backgroundColor }, style]}
      onLayout={
        wide
          ? (e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }));
            }
          : undefined
      }
    >
      <ScreenBackground
        source={bgSource}
        left={bgLeft}
        width={bgWidth}
        height={bgHeight}
        opacity={backgroundOpacity}
        blur={backgroundBlur}
        scrim={backgroundVeil}
      />
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

/**
 * The wallpaper layer, isolated and memoised.
 *
 * This is not tidiness — it is the whole point. On Android `blurRadius` is a
 * CPU box-blur applied to the *decoded bitmap*, and these scenes are 941x1672,
 * so roughly 1.6M pixels get re-blurred every time this `Image` element
 * re-renders. Inline in `AppShell` it re-rendered on every parent render — every
 * scroll-driven state update, every store tick — which is exactly the stutter
 * you feel under a finger.
 *
 * Memoised on its six scalar props, it renders once per screen and then never
 * again, so the blur is paid for at mount and costs nothing while scrolling.
 */
export const ScreenBackground = React.memo<{
  source?: ImageSourcePropType;
  /** Negative on tablets, so the scene runs on under the sidebar. */
  left: number;
  width: number;
  height: number;
  opacity: number;
  blur: number;
  scrim: number;
}>(({ source, left, width, height, opacity, blur, scrim }) => {
  if (!source) return null;

  /*
   * Cover, not stretch. The scenes are painted 9:16; `stretch` showed all of
   * the picture by distorting it to the window, which was a mild elongation on
   * a phone but squashed a landscape tablet's wallpaper to about a third of its
   * height — trees and suns flattened into ovals.
   *
   * Scaled uniformly and cropped, anchored low — see `coverFrame`.
   */
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left, width, height, overflow: 'hidden' }}
    >
      <Image
        source={source}
        resizeMode="stretch"
        blurRadius={blur}
        style={[coverFrame(source, width, height), { opacity }]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      {scrim > 0 ? (
        // Warm dark scrim: settles the scene down rather than washing it out.
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(42,38,36,${scrim})` }]}
        />
      ) : null}
    </View>
  );
});
ScreenBackground.displayName = 'ScreenBackground';

const styles = StyleSheet.create({
  /*
   * Scrolling screens on a tablet keep to a readable column. Without it a list
   * row or settings line ran the full 1,100px of a landscape screen, its label
   * at one edge and its chevron at the other — the clearest tell of a phone
   * layout scaled up. Two-pane screens don't scroll as a whole and keep the
   * full width; a screen that sets its own narrower column is unaffected.
   */
  readableWide: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  root: {
    flex: 1,
    /* The wallpaper is drawn larger than the window and cropped here. */
    overflow: 'hidden',
  },
  /* Tablets: the wallpaper box clips itself, and must reach under the sidebar. */
  rootWide: {
    overflow: 'visible',
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
  sceneFiller: {
    backgroundColor: colors.meadow,
  },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    /* Separates stacked actions — a footer often holds two buttons, and they
       were sitting flush against each other. */
    gap: spacing.md,
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
