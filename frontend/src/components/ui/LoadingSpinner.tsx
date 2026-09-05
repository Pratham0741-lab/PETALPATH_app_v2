import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { PetalMark } from '../brand/PetalMark';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  message?: string;
}

const spinnerDimensions: Record<SpinnerSize, number | 'small' | 'large'> = {
  sm: 'small',
  md: 'large',
  lg: 'large',
};

const spinnerSizes: Record<SpinnerSize, { indicatorSize: number; fontSize: number }> = {
  sm: { indicatorSize: 20, fontSize: typography.sizes.caption },
  md: { indicatorSize: 32, fontSize: typography.sizes.small },
  lg: { indicatorSize: 48, fontSize: typography.sizes.body },
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = colors.primary,
  fullScreen = false,
  overlay = false,
  message,
}) => {
  const sSize = spinnerSizes[size];
  const indicatorSize = spinnerDimensions[size];

  const containerStyle = [
    fullScreen ? styles.fullScreen : styles.inline,
    overlay && styles.overlay,
  ];

  const IndicatorComponent = (
    <PetalMark size={fullScreen ? 96 : sSize.indicatorSize} loading />
  );

  return (
    <View
      style={containerStyle}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
      accessibilityLiveRegion="polite"
    >
      {IndicatorComponent}
      {message && (
        <Text
          style={[
            styles.message,
            { fontSize: sSize.fontSize, color: overlay ? colors.white : colors.textSecondary },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    zIndex: 1000,
  },
  message: {
    marginTop: spacing.md,
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});

export default LoadingSpinner;
