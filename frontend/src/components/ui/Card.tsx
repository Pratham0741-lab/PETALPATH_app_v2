import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, shadows, elevation } from '../../theme';

type CardVariant = 'elevated' | 'outlined' | 'flat';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: CardVariant;
  padding?: keyof typeof spacing;
  accessibilityLabel?: string;
}

const variantCardStyles: Record<CardVariant, ViewStyle> = {
  elevated: {
    backgroundColor: colors.card,
    ...shadows.md,
    borderWidth: 0,
  },
  outlined: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...elevation[1],
  },
  flat: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
};

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
  padding = 'lg',
  accessibilityLabel,
}) => {
  const containerStyle = [
    styles.base,
    { padding: spacing[padding] },
    variantCardStyles[variant],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          ...containerStyle,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
  },
});

export default Card;
