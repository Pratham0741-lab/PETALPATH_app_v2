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
import { PetalMark } from '../brand/PetalMark';

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
      <PetalMark size={size === 'small' ? 48 : 88} loading />
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
      <PetalMark size={96} loading />
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
    /* Transparent: these fill the screen, and an opaque fill hid the
       wallpaper of whatever screen was loading. */
    backgroundColor: 'transparent',
    padding: 32,
  },
  fullPageLabel: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
