import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  onLeftPress?: () => void;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
  variant?: 'default' | 'compact' | 'large';
  showBack?: boolean;
  backFallback?: () => void;
  transparent?: boolean;
  elevated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  variant = 'default',
  showBack = false,
  backFallback,
  transparent = false,
  elevated = false,
}) => {
  const navigation = useNavigation();

  const handleLeftPress = () => {
    if (onLeftPress) {
      onLeftPress();
    } else if (showBack) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else if (backFallback) {
        backFallback();
      }
    }
  };

  const showLeftButton = showBack || leftIcon;

  const titleSize =
    variant === 'large' ? typography.sizes.xxxl :
    variant === 'compact' ? typography.sizes.lg :
    typography.sizes.xxl;

  const paddingVertical =
    variant === 'compact' ? spacing.sm :
    variant === 'large' ? spacing.xl :
    spacing.md;

  return (
    <View
      style={[
        styles.container,
        { paddingVertical },
        !transparent && styles.solid,
        elevated && shadows.sm,
      ]}
      accessibilityRole="header"
      accessibilityLabel={title}
    >
      <View style={styles.side}>
        {showLeftButton ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleLeftPress}
            accessibilityRole="button"
            accessibilityLabel={showBack ? 'Go back' : undefined}
            accessibilityHint="Navigates to the previous screen"
          >
            {showBack ? (
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            ) : (
              leftIcon
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.center}>
        <Text
          style={[styles.title, { fontSize: titleSize }]}
          numberOfLines={1}
          accessibilityRole="text"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={styles.subtitle}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.side}>
        {rightIcon ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRightPress}
            accessibilityRole="button"
            accessibilityLabel={typeof rightIcon === 'string' ? rightIcon : undefined}
          >
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  solid: {
    backgroundColor: colors.surface,
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
});
