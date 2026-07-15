/**
 * Loading components
 *
 * - LoadingSpinner: configurable inline spinner (size + color)
 * - FullPageLoader: centered full-screen loading state
 *
 * Generic, reusable building blocks for feature screens.
 */
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large' | number;
  color?: string;
  label?: string;
  style?: any;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = colors.primary,
  label,
  style,
}) => {
  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size={size} color={color} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
};

interface FullPageLoaderProps {
  label?: string;
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({ label = 'Loading…' }) => {
  return (
    <View style={styles.fullPage}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.fullPageLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  fullPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  fullPageLabel: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
