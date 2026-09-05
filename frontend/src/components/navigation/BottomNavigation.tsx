import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius, shadows, spacing, typography, bottomNavSizes } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * BottomNavigation (spec §9).
 *
 * Six destinations, each an SVG icon plus a always-visible label. The active
 * item is pink — filled icon, pink label, and a pink indicator bar above it —
 * so the selected state is carried by shape and position as well as colour
 * (§30). Sticky, with the bottom safe-area inset respected; screens reserve
 * matching space via `AppShell withBottomNav`.
 *
 * Route names come from `MobileTabs` in RootNavigator and must stay in step.
 */

type TabConfig = { route: string; icon: PetalIconName; label: string };

const TABS: TabConfig[] = [
  { route: 'Home', icon: 'home', label: 'Home' },
  // The stack route is called "Journey"; it is the Explore tab to the child.
  { route: 'Journey', icon: 'explore', label: 'Explore' },
  { route: 'Camera', icon: 'camera', label: 'Camera' },
  { route: 'Mentor', icon: 'mentors', label: 'Mentors' },
  { route: 'Rewards', icon: 'rewards', label: 'Rewards' },
  { route: 'Profile', icon: 'profile', label: 'Profile' },
];

const FALLBACK: Omit<TabConfig, 'route'> = { icon: 'sparkle', label: '' };

export const BottomNavigation: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
      accessibilityRole="tablist"
    >
      {/*
        Frosted glass: the wallpaper behind the bar is blurred rather than merely
        shown through it, so the bar reads as a surface instead of a window. The
        tint above it is what keeps the labels legible — blur alone does not
        guarantee contrast, since a dark patch of scene stays dark once blurred.
        On Android below API 31 expo-blur degrades to a plain translucent fill,
        which is exactly the look this had before, so nothing breaks.
      */}
      <BlurView
        intensity={72}
        tint="light"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const cfg = TABS.find((t) => t.route === route.name);
        const icon = cfg?.icon ?? FALLBACK.icon;
        const label = cfg?.label || route.name;

        const options = descriptors[route.key]?.options;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true } as any);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        const tint = isFocused ? colors.primary : colors.textSecondary;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
            testID={options?.tabBarButtonTestID ?? `tab-${route.name}`}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
          >
            {/* Position, not just colour, marks the active tab. */}
            <View style={[styles.indicator, isFocused && styles.indicatorActive]} />
            {/* A soft tinted pill behind the active icon — a modern, premium tab cue. */}
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <PetalIcon
                name={icon}
                size={bottomNavSizes.iconSize}
                color={tint}
                filled={isFocused}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                typography.presets.navLabel,
                styles.label,
                { color: tint, fontWeight: isFocused ? '900' : '600' },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    /*
     * Floats over the screen rather than sitting below it in the layout, so the
     * wallpaper runs on behind the bar and the translucency below actually shows
     * the scene instead of a flat navigator background. Screens already reserve
     * the matching space via `AppShell withBottomNav`, so nothing is covered.
     */
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    /*
     * Sits on top of the BlurView, so this is a tint rather than the whole
     * surface: enough to lift the labels off the scene and give the bar its
     * lavender identity, while the blur does the work of separating it.
     */
    backgroundColor: 'rgba(243, 240, 253, 0.62)',
    /* Clips the blur layer to the bar's rounded top corners. */
    overflow: 'hidden',
    borderTopLeftRadius: radius.bottomNav,
    borderTopRightRadius: radius.bottomNav,
    borderTopWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
    // The bar must sit above page content on both platforms.
    ...Platform.select({ android: { elevation: 12 }, default: null }),
  },
  tab: {
    flex: 1,
    minHeight: bottomNavSizes.height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 3,
  },
  tabPressed: {
    opacity: 0.65,
  },
  iconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: bottomNavSizes.labelSize,
    textAlign: 'center',
  },
});

export default BottomNavigation;
