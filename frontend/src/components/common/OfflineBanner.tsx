import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon } from '../icons';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { checkServerHealth } from '../../api/health';

/**
 * Global offline banner.
 *
 * Renders only when connectivity is lost (returns null otherwise, so there is
 * zero layout impact while online). The Retry action re-checks backend
 * reachability via the existing health endpoint and, if healthy, refetches all
 * active React Query caches — preventing silent stale states after reconnect.
 *
 * Redesign notes (§3, §7, §30): the strip used to be `#B45309`, an amber that
 * belongs to no palette, with a white-on-amber label at ~2.5:1. It now uses the
 * app's amber tint pair — `warningLight` behind `warningDark` text and icon,
 * which clears 4.5:1 — and the Ionicons cloud is the `warning` glyph. Retry is
 * visually a 32px pill, but `hitSlop` gives it a 48px touch target so the strip
 * can stay thin without shrinking the target.
 */
const OfflineBannerBase: React.FC = () => {
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();

  const handleRetry = useCallback(async () => {
    const health = await checkServerHealth();
    if (health.isHealthy) {
      await queryClient.refetchQueries({ type: 'active' });
    }
  }, [queryClient]);

  if (!isOffline) return null;

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel="You are offline. Some features may be limited."
    >
      <PetalIcon name="warning" size={16} color={colors.warningDark} filled />
      <Text style={[typography.presets.caption, styles.text]} numberOfLines={1}>
        You&apos;re offline. Some features may be limited.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        onPress={handleRetry}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Retry connection"
        accessibilityHint="Reconnects and refreshes content"
      >
        <Text style={[typography.presets.caption, styles.retryText]}>Retry</Text>
      </Pressable>
    </View>
  );
};

export const OfflineBanner = React.memo(OfflineBannerBase);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    flex: 1,
    minWidth: 0,
    color: colors.warningDark,
    fontWeight: '700',
  },
  retry: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.warningDark,
  },
  retryPressed: {
    opacity: 0.6,
  },
  retryText: {
    color: colors.warningDark,
    fontWeight: '800',
  },
});

export default OfflineBanner;
