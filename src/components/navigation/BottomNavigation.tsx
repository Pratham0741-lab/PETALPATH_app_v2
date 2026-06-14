import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { colors, typography, spacing, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export const BottomNavigation: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const tabs = [
    { name: 'Home', icon: 'map' },
    { name: 'Journey', icon: 'compass' },
    { name: 'Mentor', icon: 'paw' },
    { name: 'Rewards', icon: 'trophy' },
    { name: 'Profile', icon: 'person' },
  ];

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

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

        const tab = tabs.find((t) => t.name === route.name) || { name: route.name, icon: 'help-circle' };

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
              size={24}
              color={isFocused ? colors.purple : colors.textMuted}
            />
            <Text style={[styles.label, { color: isFocused ? colors.purple : colors.textMuted }]}>
              {label as string}
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
    height: 76,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
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
    fontSize: 10,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
});
