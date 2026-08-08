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
  if (isStarting) {
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
      <Text style={styles.progressText}>{pct}% Hold</Text>
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
    width: 180,
    alignItems: 'center',
  },
  backgroundBar: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: radius.full,
  },
  progressText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
});
