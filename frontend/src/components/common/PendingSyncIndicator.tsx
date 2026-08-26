import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon } from '../icons';
import { useOfflineSync } from '../../hooks/useOfflineSync';

/**
 * Compact indicator that shows how many requests are pending synchronization
 * while offline, or a brief syncing spinner when the queue is flushing.
 * Renders null when everything is idle and online.
 *
 * Redesign notes (§3, §7): the pill was `primaryDark` — brand pink, which the
 * app now reserves for actions the child can take, and this is neither an
 * action nor the child's business. It reads as calm status instead: the blue
 * information tint with `blueDark` on top, and the `arrowUp` glyph in place of
 * the Ionicons cloud. It also owns its own vertical margin now, so
 * `AppProviders` no longer holds an 8px gap open on every screen for a pill
 * that is usually absent.
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
        <ActivityIndicator size="small" color={colors.blueDark} />
      ) : (
        <PetalIcon name="arrowUp" size={14} color={colors.blueDark} />
      )}
      <Text style={[typography.presets.caption, styles.text]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    backgroundColor: colors.blueSoft,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  text: {
    color: colors.blueDark,
    fontWeight: '700',
  },
});

export default PendingSyncIndicator;
