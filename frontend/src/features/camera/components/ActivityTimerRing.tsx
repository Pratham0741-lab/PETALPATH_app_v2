import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, radius, typography } from '../../../theme';

interface ActivityTimerRingProps {
  progressMs: number;
  targetMs: number;
  countdownSec?: number;
  isStarting?: boolean;
}

export const ActivityTimerRing: React.FC<ActivityTimerRingProps> = ({
  progressMs,
  targetMs,
  countdownSec = 0,
  isStarting = false,
}) => {
  if (isStarting && countdownSec > 0) {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>{countdownSec}</Text>
      </View>
    );
  }

  const ratio = Math.min(1, Math.max(0, progressMs / Math.max(1, targetMs)));
  const pct = Math.round(ratio * 100);

  return (
    <View style={styles.ringContainer}>
      <View style={styles.backgroundBar}>
        <View style={[styles.fillBar, { width: `${pct}%` }]} />
      </View>
      <View style={styles.labelBadge}>
        <Text style={styles.progressText}>
          {pct === 100 ? '✅ Pose Held!' : `🙌 Hold Pose: ${pct}%`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  countdownContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 120, 216, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  countdownText: {
    fontFamily: typography.families.rounded,
    fontSize: 56,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  ringContainer: {
    width: 260,
    alignItems: 'center',
  },
  backgroundBar: {
    width: '100%',
    height: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    backgroundColor: '#10B981', // Vibrant Emerald Green
    borderRadius: radius.full,
  },
  labelBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  progressText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default ActivityTimerRing;
