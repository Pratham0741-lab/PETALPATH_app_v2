import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type TabsVariant = 'underline' | 'pill' | 'segmented';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  variant?: TabsVariant;
  style?: StyleProp<ViewStyle>;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  style,
}) => {
  const indicatorOffset = useRef(new Animated.Value(0)).current;
  const tabWidth = useRef(0);

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.key === activeTab);
    if (activeIndex >= 0) {
      Animated.spring(indicatorOffset, {
        toValue: activeIndex * tabWidth.current,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab, tabs, indicatorOffset]);

  const isUnderline = variant === 'underline';
  const isSegmented = variant === 'segmented';
  const isPill = variant === 'pill';

  return (
    <View style={[styles.container, isSegmented && styles.segmentedContainer, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.track,
          isSegmented && styles.segmentedTrack,
        ]}
        accessibilityRole="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onLayout={(e) => {
                if (!isActive) return;
                tabWidth.current = e.nativeEvent.layout.width;
              }}
              style={[
                styles.tab,
                isSegmented && styles.segmentedTab,
                isPill && {
                  borderRadius: radius.chip,
                  marginHorizontal: spacing.xs,
                },
                isPill && isActive && {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeLabel,
                  isPill && isActive && { color: colors.textInverse },
                ]}
              >
                {tab.label}
              </Text>
              {isUnderline && isActive && (
                <View style={styles.underlineActive} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  segmentedContainer: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.chip,
    padding: spacing.xs,
  },
  track: {
    flexDirection: 'row',
    position: 'relative',
  },
  segmentedTrack: {
    flex: 1,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md - 2,
  },
  tabLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  underlineActive: {
    position: 'absolute',
    bottom: 0,
    left: spacing.xl,
    right: spacing.xl,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
});

export default Tabs;
