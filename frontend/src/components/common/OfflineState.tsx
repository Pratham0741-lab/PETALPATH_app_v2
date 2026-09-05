import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';

interface OfflineStateProps {
  title?: string;
  message?: string;
  suggestion?: string;
}

export const OfflineState: React.FC<OfflineStateProps> = ({
  title = 'No Connection',
  message = 'You are currently offline.',
  suggestion = 'Please check your internet connection and try again.',
}) => {
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${title}: ${message}`}
    >
      <Ionicons name="cloud-offline" size={72} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.suggestion}>{suggestion}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    /* Transparent: these fill the screen, and an opaque fill hid the
       wallpaper of whatever screen was loading. */
    backgroundColor: 'transparent',
    padding: spacing.xxl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  suggestion: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    lineHeight: typography.lineHeights.sm,
    maxWidth: 280,
  },
});
