import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { colors, typography, spacing, shadows, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export const BottomNavigation: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const tabs = [
    { name: 'Home', icon: 'home', label: 'Home' },
    { name: 'Journey', icon: 'compass', label: 'Explore' },
    { name: 'Mentor', icon: 'flower', label: 'Garden' },
    { name: 'Rewards', icon: 'stats-chart', label: 'Progress' },
    { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

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

        const tab = tabs.find((t) => t.name === route.name) || { name: route.name, icon: 'help-circle', label: route.name };
        const activeColor = colors.purple; // #8B78D8
        const inactiveColor = '#8F8A82';

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [
              styles.tabItem,
              { transform: [{ scale: pressed ? 0.92 : 1.0 }] }
            ]}
          >
            <Ionicons
              name={tab.icon as any}
              size={26}
              color={isFocused ? activeColor : inactiveColor}
            />
            <Text style={[
              styles.label, 
              { 
                color: isFocused ? activeColor : inactiveColor,
                fontFamily: typography.families.rounded,
              }
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 85,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.bottomNav,
    borderTopRightRadius: radius.bottomNav,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    ...shadows.lg,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginTop: 4,
  },
});
export default BottomNavigation;
