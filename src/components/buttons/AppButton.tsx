import React from 'react';
import { Pressable, StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'reward' | 'danger';
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
      transform: [{ scale: pressed && !disabled ? 0.95 : 1.0 }],
      opacity: disabled ? 0.6 : 1.0,
    };

    let variantStyle: ViewStyle = {};
    switch (variant) {
      case 'primary':
        variantStyle = { backgroundColor: colors.purple };
        break;
      case 'secondary':
        variantStyle = { backgroundColor: colors.blue };
        break;
      case 'accent':
        variantStyle = { backgroundColor: colors.yellow };
        break;
      case 'success':
        variantStyle = { backgroundColor: colors.green };
        break;
      case 'reward':
        variantStyle = { backgroundColor: colors.yellow };
        break;
      case 'danger':
        variantStyle = { backgroundColor: colors.coral };
        break;
    }

    return [baseStyles, variantStyle, style];
  };

  const getLabelColor = (): string => {
    if (variant === 'reward' || variant === 'accent') {
      return colors.brown;
    }
    return '#FFF8ED';
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => getButtonStyles(pressed)}
    >
      {loading ? (
        <ActivityIndicator color={getLabelColor()} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[
            styles.label, 
            { 
              color: getLabelColor(), 
              fontFamily: typography.families.rounded,
            }, 
            labelStyle
          ]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.button,
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
  label: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
export default AppButton;
