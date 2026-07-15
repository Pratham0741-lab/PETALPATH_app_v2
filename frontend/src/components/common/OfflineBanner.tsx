import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { checkServerHealth } from '../../api/health';

/**
 * Global offline banner.
 *
 * Renders only when connectivity is lost (returns null otherwise, so there is
 * zero layout impact while online). The Retry action re-checks backend
 * reachability via the existing health endpoint and, if healthy, refetches all
 * active React Query caches — preventing silent stale states after reconnect.
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
      <Ionicons name="cloud-offline" size={18} color={colors.white} style={styles.icon} />
      <Text style={styles.text} numberOfLines={1}>
        You&apos;re offline. Some features may be limited.
      </Text>
      <TouchableOpacity
        style={styles.retry}
        onPress={handleRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry connection"
        accessibilityHint="Reconnects and refreshes content"
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

export const OfflineBanner = React.memo(OfflineBannerBase);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B45309',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    flex: 1,
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  retry: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  retryText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});
