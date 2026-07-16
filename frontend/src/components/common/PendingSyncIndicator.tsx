import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { useOfflineSync } from '../../hooks/useOfflineSync';

/**
 * Compact indicator that shows how many requests are pending synchronization
 * while offline, or a brief syncing spinner when the queue is flushing.
 * Renders null when everything is idle and online.
 */
export const PendingSyncIndicator: React.FC = () => {
  const { pending, isSyncing, isOffline } = useOfflineSync();

  if (pending === 0 && !isSyncing) return null;

  const label = isSyncing
    ? 'Syncing…'
    : isOffline
      ? `${pending} pending while offline`
      : `${pending} pending`;

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={colors.white} style={styles.icon} />
      ) : (
        <Ionicons name="cloud-upload" size={14} color={colors.white} style={styles.icon} />
      )}
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  icon: {
    marginRight: 2,
  },
  text: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});
