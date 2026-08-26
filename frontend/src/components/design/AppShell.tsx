import React from 'react';
import {
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
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, spacing, bottomNavSizes } from '../../theme';
import { useTutorialStore } from '../../store/tutorialStore';
import { PetalBackground, PetalDensity } from './PetalBackground';

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
  /** Pinned above the scroll area — headers belong here. */
  header?: React.ReactNode;
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
  header,
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
      {header}
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor }, style]} edges={resolvedEdges} testID={testID}>
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default AppShell;
