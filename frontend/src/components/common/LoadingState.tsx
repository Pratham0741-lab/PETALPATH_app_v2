import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { PetalMark } from '../brand/PetalMark';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  fullScreen = true,
}) => {
  return (
    <View
      style={[styles.container, !fullScreen && styles.inline]}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
      accessibilityLiveRegion="polite"
    >
      <PetalMark size={96} loading />
      {message ? (
        <Text style={styles.message} accessibilityRole="text">{message}</Text>
      ) : null}
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
  inline: {
    flex: 0,
    paddingVertical: spacing.xxl,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
