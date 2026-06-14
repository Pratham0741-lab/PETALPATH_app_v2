import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from '../../navigation/navigationRef';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor } from '../../constants/mentors';

interface SidebarNavigationProps {
  deviceType: 'tablet' | 'desktop';
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ deviceType }) => {
  const [activeRoute, setActiveRoute] = useState('Home');

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
    // Execute initial check
    listener();

    return () => {
      navigationRef.removeListener('state', listener);
    };
  }, []);

  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = activeChild?.mentor ? enhanceMentor(activeChild.mentor) : null;

  const tabs = [
    { name: 'Home', label: 'Roadmap', icon: 'map' },
    { name: 'Journey', label: 'Journey', icon: 'compass' },
    { name: 'Mentor', label: 'My Mentor', icon: 'paw' },
    { name: 'Rewards', label: 'Rewards', icon: 'trophy' },
    { name: 'Profile', label: 'Profile', icon: 'person' },
  ];

  const isDesktop = deviceType === 'desktop';

  return (
    <View style={[styles.container, isDesktop ? styles.desktopWidth : styles.tabletWidth]}>
      <View style={{ flex: 1 }}>
        {/* Top Header/Logo Area */}
        <View style={styles.header}>
          <Ionicons name="flower-outline" size={32} color={colors.purple} />
          {isDesktop && <Text style={styles.logoText}>PetalPath</Text>}
        </View>

        {/* Navigation Items */}
        <View style={styles.navItems}>
          {tabs.map((tab) => {
            const isFocused = activeRoute === tab.name;

            const onPress = () => {
              if (navigationRef.isReady()) {
                navigationRef.navigate(tab.name);
              }
            };

            return (
              <Pressable
                key={tab.name}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tabItem,
                  isFocused && styles.tabItemFocused,
                  !isDesktop && styles.tabItemTablet,
                  { transform: [{ scale: pressed ? 0.95 : 1.0 }] },
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={22}
                  color={isFocused ? colors.white : colors.textMuted}
                />
                {isDesktop && (
                  <Text style={[styles.label, isFocused && styles.labelFocused]}>
                    {tab.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer Area with Mentor indicator */}
      {activeMentor && (
        <View style={[styles.footer, !isDesktop && styles.footerTablet]}>
          <View
            style={[
              styles.mentorIndicator,
              { backgroundColor: activeMentor.color + '20' },
              !isDesktop && styles.mentorIndicatorTablet,
            ]}
          >
            <Ionicons name="paw" size={16} color={activeMentor.color} />
            {isDesktop && (
              <Text style={[styles.mentorName, { color: activeMentor.color }]}>
                {activeMentor.name.split(' ')[0]}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  desktopWidth: {
    width: 240,
    paddingHorizontal: spacing.lg,
  },
  tabletWidth: {
    width: 80,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xxl,
  },
  logoText: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    marginLeft: spacing.sm,
  },
  navItems: {
    gap: spacing.md,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  tabItemFocused: {
    backgroundColor: colors.purple,
  },
  tabItemTablet: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 52,
    height: 52,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.md,
  },
  labelFocused: {
    color: colors.white,
  },
  footer: {
    paddingHorizontal: spacing.sm,
  },
  footerTablet: {
    alignItems: 'center',
  },
  mentorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  mentorIndicatorTablet: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  mentorName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
  },
});
