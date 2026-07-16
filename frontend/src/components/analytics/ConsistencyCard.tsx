import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';

interface ConsistencyCardProps {
  score: number;
  currentStreak: number;
  longestStreak: number;
  loading?: boolean;
  style?: ViewStyle;
}

export function ConsistencyCard({
  score,
  currentStreak,
  longestStreak,
  loading = false,
  style,
}: ConsistencyCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading consistency">
        <Skeleton width={100} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: spacing.xs }} />
        <Skeleton variant="rect" width="100%" height={10} style={{ marginBottom: spacing.lg, borderRadius: radius.xs }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Skeleton variant="circle" width={24} height={24} />
            <Skeleton width={40} height={14} style={{ marginTop: spacing.xs }} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Skeleton variant="circle" width={24} height={24} />
            <Skeleton width={40} height={14} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card
      style={style}
      accessibilityLabel={`Consistency: ${Math.round(score)}%, current streak ${currentStreak} days, longest streak ${longestStreak} days`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Consistency</Text>

      <View style={styles.scoreRow}>
        <Text style={[styles.scoreLabel, { color: themeColors.textSecondary }]}>Consistency Score</Text>
        <Text style={[styles.scoreValue, { color: themeColors.text }]}>{Math.round(score)}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: themeColors.surfaceSecondary }]}>
        <View style={[styles.fill, { width: `${score}%`, backgroundColor: themeColors.leafGreen }]} />
      </View>

      <View style={styles.streakRow}>
        <View style={styles.streakItem}>
          <Ionicons name="flame" size={24} color={themeColors.warning} />
          <Text style={[styles.streakValue, { color: themeColors.text }]}>{currentStreak}</Text>
          <Text style={[styles.streakLabel, { color: themeColors.textMuted }]}>Current Streak</Text>
        </View>
        <View style={styles.streakItem}>
          <Ionicons name="trophy" size={24} color={themeColors.accent} />
          <Text style={[styles.streakValue, { color: themeColors.text }]}>{longestStreak}</Text>
          <Text style={[styles.streakLabel, { color: themeColors.textMuted }]}>Longest Streak</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  scoreLabel: {
    fontSize: typography.sizes.small,
  },
  scoreValue: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  track: {
    height: 10,
    borderRadius: radius.xs,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  fill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  streakValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  streakLabel: {
    fontSize: typography.sizes.caption,
  },
});

export default ConsistencyCard;
