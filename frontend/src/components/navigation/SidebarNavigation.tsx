import React, { useEffect, useState } from 'react';
import { ScreenBackground } from '../design/AppShell';
import { useWallpaperStore } from '../../store/wallpaperStore';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomNavSizes, colors, radius, spacing, typography } from '../../theme';
import { AvatarGlyph } from '../design';
import { PetalIcon, PetalIconName } from '../icons';
import { navigate, navigationRef } from '../../navigation/navigationRef';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor } from '../../constants/mentors';
import type { RootStackParamList } from '../../types/navigation';

/**
 * SidebarNavigation (spec §9) — the tablet and desktop form of the bottom bar.
 *
 * `RootNavigator` renders this instead of `BottomNavigation` once the device is
 * a tablet or desktop, so it is live UI and had to move onto the design system
 * with everything else. It mirrors the bottom bar deliberately: the same six
 * destinations in the same order, the same `PetalIcon` glyphs, the same pink
 * active treatment, filled icon plus an indicator bar — rotated from the top
 * edge of a tab to its leading edge (§30: state is never colour alone).
 *
 * It was also broken. The sidebar used to be a dark panel, so its icons and
 * labels were hardcoded cream — `#FFF8ED` and `#E6DAC4`. `colors.sidebar` is
 * `#FFFFFF` in the redesigned palette, which left cream text on a white panel:
 * an invisible navigation rail on every tablet. All six colours now come from
 * tokens, so the panel and its contents can never drift apart again.
 *
 * The tablet rail is icons only at 80px wide, so each tab carries an explicit
 * `accessibilityLabel` — the visible label is the fallback, not the source.
 */

type TabConfig = { route: keyof RootStackParamList; icon: PetalIconName; label: string };

const TABS: TabConfig[] = [
  { route: 'Home', icon: 'home', label: 'Home' },
  // The stack route is called "Journey"; it is the Explore tab to the child.
  { route: 'Journey', icon: 'explore', label: 'Explore' },
  { route: 'Camera', icon: 'camera', label: 'Move & Play' },
  { route: 'Mentor', icon: 'mentors', label: 'Mentors' },
  { route: 'Rewards', icon: 'rewards', label: 'Rewards' },
  { route: 'Profile', icon: 'profile', label: 'Profile' },
];

export { SIDEBAR_WIDTH, useSidebarExpanded, useSidebarWidth } from './sidebarLayout';
import { useSidebarExpanded, useSidebarWidth } from './sidebarLayout';

interface SidebarNavigationProps {
  deviceType: 'tablet' | 'desktop';
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ deviceType }) => {
  const [activeRoute, setActiveRoute] = useState<string>('Home');

  useEffect(() => {
    const listener = () => {
      if (navigationRef.isReady()) {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute) {
          setActiveRoute(currentRoute.name);
        }
      }
    };

    navigationRef.addListener('state', listener);
    listener();

    return () => {
      navigationRef.removeListener('state', listener);
    };
  }, []);

  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = activeChild?.mentor ? enhanceMentor(activeChild.mentor) : null;

  /* "Desktop" styling = the expanded panel, used by landscape tablets too. */
  const isDesktop = useSidebarExpanded(deviceType);
  const width = useSidebarWidth(deviceType);
  const wallpaper = useWallpaperStore((st) => st.wallpaper);
  const { width: windowWidth } = useWindowDimensions();
  const [columnHeight, setColumnHeight] = useState(0);
  const insets = useSafeAreaInsets();

  return (
    /*
     * The sidebar's column. It paints the focused screen's own wallpaper —
     * full-window geometry, same blur and dimming, so it continues the screen's
     * scene exactly (the screen container clips its own copy at its edge) —
     * and the rail floats on top of it.
     */
    <View
      style={[styles.column, { width }]}
      onLayout={(e) => setColumnHeight(e.nativeEvent.layout.height)}
    >
      {wallpaper && columnHeight > 0 ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: wallpaper.backgroundColor }]}
        >
          <ScreenBackground
            source={wallpaper.source}
            left={0}
            width={windowWidth}
            height={columnHeight}
            opacity={wallpaper.opacity}
            blur={wallpaper.blur}
            scrim={wallpaper.scrim}
          />
        </View>
      ) : null}

    {/*
      The rail itself: the phone tab bar's frosted glass turned on its side.
      It floats inset from the screen's edges with fully rounded corners, and
      its blur and lavender tint sit over the scene behind it, which shows
      around and through it.
    */}
    <View
      style={[
        styles.container,
        {
          width: width - RAIL_INSET * 2,
          marginTop: insets.top + RAIL_INSET,
          marginBottom: insets.bottom + RAIL_INSET,
        },
        isDesktop ? styles.railExpanded : styles.railCompact,
      ]}
      accessibilityRole="tablist"
    >
      <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
      <View style={styles.top}>
        {/* Brand mark */}
        <View style={[styles.header, !isDesktop && styles.headerTablet]}>
          <AvatarGlyph species="flower" size={36} />
          {isDesktop ? (
            <Text style={[typography.presets.cardTitle, styles.logoText]} numberOfLines={1}>
              PetalPath
            </Text>
          ) : null}
        </View>


        {/*
          Whose app this is, at the top of the panel — tapping it opens their
          profile. On a phone the avatar lives in Home's header; on a tablet the
          panel is always on screen, so the child sees themselves on every page.
        */}
        {isDesktop && activeChild ? (
          <Pressable
            onPress={() => navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel={`${activeChild.name}'s profile`}
            style={({ pressed }) => [styles.childCard, pressed && styles.tabItemPressed]}
          >
            <AvatarGlyph species={activeChild.avatar} size={44} ringColor={colors.primary} />
            <View style={styles.childText}>
              <Text style={[typography.presets.cardTitle, styles.childName]} numberOfLines={1}>
                {activeChild.name}
              </Text>
              {activeMentor ? (
                <Text style={[typography.presets.caption, styles.childSub]} numberOfLines={1}>
                  with {activeMentor.name.split(' ')[0]}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ) : null}

        <View style={styles.navItems}>
          {TABS.map((tab) => {
            const isFocused = activeRoute === tab.route;
            const tint = isFocused ? colors.primary : colors.textSecondary;

            return (
              <Pressable
                key={tab.route}
                onPress={() => navigate(tab.route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={tab.label}
                testID={`sidebar-tab-${tab.route}`}
                style={({ pressed }) => [
                  styles.tabItem,
                  isDesktop ? styles.tabItemDesktop : styles.tabItemTablet,
                  isFocused && styles.tabItemFocused,
                  pressed && styles.tabItemPressed,
                ]}
              >
                {/* Position, not just colour, marks the active tab. */}
                <View style={[styles.indicator, isFocused && styles.indicatorActive]} />
                <PetalIcon
                  name={tab.icon}
                  size={bottomNavSizes.iconSize}
                  color={tint}
                  filled={isFocused}
                  strokeWidth={isFocused ? 2 : 1.9}
                />
                {/*
                  Labelled on tablets too. The rail used to be icons only, but
                  the people using it are two to six: a compass or a gift box is
                  not self-explanatory, and a parent reading over a shoulder
                  should not have to guess either. A tablet has the width.
                */}
                <Text
                  numberOfLines={1}
                  style={[
                    isDesktop ? typography.presets.body : typography.presets.caption,
                    isDesktop ? styles.label : styles.labelTablet,
                    { color: tint },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Who is helping today — the compact rail only; the expanded panel names
          the buddy in the child's card at the top. */}
      {activeMentor && !(isDesktop && activeChild) ? (
        <View style={[styles.footer, !isDesktop && styles.footerTablet]}>
          <View
            accessible
            accessibilityLabel={`Your mentor, ${activeMentor.name}`}
            style={[
              styles.mentorIndicator,
              isDesktop ? styles.mentorIndicatorDesktop : styles.mentorIndicatorTablet,
            ]}
          >
            <AvatarGlyph
              species={activeMentor.species}
              size={isDesktop ? 30 : 34}
              ringColor={activeMentor.color}
            />
            {isDesktop ? (
              <Text style={[typography.presets.caption, styles.mentorName]} numberOfLines={1}>
                {activeMentor.name.split(' ')[0]}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
    </View>
  );
};

/** Gap between the floating rail and the screen edges / content. */
const RAIL_INSET = 12;

const styles = StyleSheet.create({
  column: {
    height: '100%',
    /* The wallpaper copy is window-sized; only the column's slice may show,
       or it spills over the screen and washes the content out. */
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    marginLeft: RAIL_INSET,
    overflow: 'hidden',
    /* Rounded like the phone tab bar's top corners, all four here. */
    borderRadius: radius.bottomNav,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  railCompact: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  railExpanded: {
    paddingHorizontal: spacing.md,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childText: {
    flex: 1,
    minWidth: 0,
  },
  childName: {
    color: colors.text,
  },
  childSub: {
    color: colors.textSecondary,
  },
  /* The phone tab bar's tint (`BottomNavigation`), laid over the scene. */
  tint: {
    backgroundColor: 'rgba(243, 240, 253, 0.62)',
  },
  top: {
    flex: 1,
    alignSelf: 'stretch',
  },

  // ---------------------------------------------------------------- brand mark
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xxl,
  },
  headerTablet: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  logoText: {
    flex: 1,
    minWidth: 0,
    color: colors.primary,
  },

  // --------------------------------------------------------------------- tabs
  navItems: {
    gap: spacing.sm,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    // Comfortably past the 44px minimum on both widths (§30).
    minHeight: 52,
  },
  tabItemDesktop: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    gap: spacing.md,
  },
  tabItemTablet: {
    width: 80,
    flexDirection: 'column',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  tabItemFocused: {
    backgroundColor: colors.primaryLight,
  },
  tabItemPressed: {
    opacity: 0.65,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    width: 3,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.transparent,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  labelTablet: {
    textAlign: 'center',
  },

  // ------------------------------------------------------------------- mentor
  footer: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  footerTablet: {
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  mentorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
  },
  mentorIndicatorDesktop: {
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  mentorIndicatorTablet: {
    padding: spacing.xs,
  },
  mentorName: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontWeight: '700',
  },
});

export default SidebarNavigation;
