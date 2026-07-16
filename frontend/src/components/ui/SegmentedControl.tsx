import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type SegmentedSize = 'sm' | 'md' | 'lg';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  size?: SegmentedSize;
}

const segmentedSizes: Record<SegmentedSize, { height: number; fontSize: number; paddingHorizontal: number }> = {
  sm: { height: 32, fontSize: typography.sizes.caption, paddingHorizontal: spacing.md },
  md: { height: 40, fontSize: typography.sizes.small, paddingHorizontal: spacing.lg },
  lg: { height: 48, fontSize: typography.sizes.body, paddingHorizontal: spacing.xl },
};

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onSelect,
  size = 'md',
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const segmentWidth = useRef(0);
  const sSize = segmentedSizes[size];

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: selectedIndex * segmentWidth.current,
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    segmentWidth.current = e.nativeEvent.layout.width / segments.length;
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: sSize.height,
          borderRadius: sSize.height / 2,
        },
      ]}
      onLayout={handleLayout}
      accessibilityRole="tablist"
    >
      <Animated.View
        style={[
          styles.slider,
          {
            height: sSize.height - 4,
            borderRadius: (sSize.height - 4) / 2,
            width: segmentWidth.current > 0 ? `${100 / segments.length}%` : undefined,
            transform: [{ translateX }],
          },
        ]}
      />
      {segments.map((segment, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={segment}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={segment}
            style={[
              styles.segment,
              { paddingHorizontal: sSize.paddingHorizontal },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  fontSize: sSize.fontSize,
                  color: isSelected ? colors.textInverse : colors.textSecondary,
                  fontWeight: isSelected ? typography.weights.bold : typography.weights.medium,
                },
              ]}
            >
              {segment}
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
    backgroundColor: colors.surfaceSecondary,
    padding: 2,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  slider: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: colors.primary,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  label: {
    fontFamily: typography.families.rounded,
    textAlign: 'center',
  },
});

export default SegmentedControl;
