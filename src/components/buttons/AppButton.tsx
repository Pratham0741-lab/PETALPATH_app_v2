import React from 'react';
import { Pressable, StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  labelStyle,
  icon,
}) => {
  const getButtonStyles = (pressed: boolean): StyleProp<ViewStyle> => {
    const baseStyles: ViewStyle = {
      ...styles.button,
      transform: [{ scale: pressed && !disabled ? 0.96 : 1.0 }],
      opacity: disabled ? 0.6 : 1.0,
    };

    let variantStyle: ViewStyle = {};
    switch (variant) {
      case 'primary':
        variantStyle = styles.primary;
        break;
      case 'secondary':
        variantStyle = styles.secondary;
        break;
      case 'accent':
        variantStyle = styles.accent;
        break;
      case 'danger':
        variantStyle = styles.danger;
        break;
    }

    return [baseStyles, variantStyle, style];
  };

  const getLabelStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryLabel;
      default:
        return styles.label;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => getButtonStyles(pressed)}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.purple : colors.white} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[getLabelStyle(), labelStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    ...shadows.sm,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  primary: {
    backgroundColor: colors.purple,
  },
  secondary: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  accent: {
    backgroundColor: colors.blue,
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  label: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  secondaryLabel: {
    color: colors.purple,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
