import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bottomNavSizes, colors, radius, shadows, spacing, typography } from '../../theme';
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
  { route: 'Camera', icon: 'camera', label: 'Camera' },
  { route: 'Mentor', icon: 'mentors', label: 'Mentors' },
  { route: 'Rewards', icon: 'rewards', label: 'Rewards' },
  { route: 'Profile', icon: 'profile', label: 'Profile' },
];

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

  const isDesktop = deviceType === 'desktop';

  return (
    <View
      style={[styles.container, isDesktop ? styles.desktopWidth : styles.tabletWidth]}
      accessibilityRole="tablist"
    >
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
                {isDesktop ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      typography.presets.body,
                      styles.label,
                      { color: tint, fontWeight: isFocused ? '900' : '600' },
                    ]}
                  >
                    {tab.label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Who is helping today */}
      {activeMentor ? (
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
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
    ...shadows.lg,
  },
  desktopWidth: {
    width: 240,
    paddingHorizontal: spacing.md,
  },
  tabletWidth: {
    width: 80,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
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
    width: 56,
    justifyContent: 'center',
    alignSelf: 'center',
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
