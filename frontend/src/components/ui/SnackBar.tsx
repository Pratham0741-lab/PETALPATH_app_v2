import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type SnackBarType = 'info' | 'error' | 'success';

interface SnackBarProps {
  message: string;
  action?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  visible: boolean;
  type?: SnackBarType;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const snackColors: Record<SnackBarType, string> = {
  info: colors.textPrimary,
  error: colors.error,
  success: colors.success,
};

export const SnackBar: React.FC<SnackBarProps> = ({
  message,
  action = false,
  actionLabel = 'OK',
  onAction,
  visible,
  type = 'info',
}) => {
  const slideAnim = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 200,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={[styles.indicator, { backgroundColor: snackColors[type] }]} />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {action && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          style={styles.actionButton}
        >
          <Text
            style={[
              styles.actionLabel,
              { color: snackColors[type] },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    maxWidth: SCREEN_WIDTH - spacing.lg * 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    ...(() => ({
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    }))(),
  },
  indicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.small,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
  actionButton: {
    marginLeft: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  actionLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
});

export default SnackBar;
