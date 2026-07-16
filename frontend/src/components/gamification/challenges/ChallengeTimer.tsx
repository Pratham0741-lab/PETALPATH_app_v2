import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';

interface Props {
  expiresAt: string;
  onExpire?: () => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export const ChallengeTimer: React.FC<Props> = ({ expiresAt, onExpire }) => {
  const [remaining, setRemaining] = useState<number>(() => new Date(expiresAt).getTime() - Date.now());
  const [expired, setExpired] = useState<boolean>(remaining <= 0);
  const [called, setCalled] = useState<boolean>(false);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const interval = setInterval(() => {
      const diff = target - Date.now();
      setRemaining(diff);
      if (diff <= 0) {
        setExpired(true);
        clearInterval(interval);
        if (!called) {
          setCalled(true);
          onExpire?.();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire, called]);

  return (
    <View style={styles.container}>
      {expired ? (
        <Text style={[styles.text, styles.expiredText]}>Expired</Text>
      ) : (
        <Text style={styles.text}>{formatRemaining(remaining)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.blue + '1A',
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.blue,
  },
  expiredText: {
    color: colors.textMuted,
  },
});
