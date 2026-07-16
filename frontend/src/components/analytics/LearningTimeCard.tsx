import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface LearningTimeCardProps {
  dailyMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  averageSessionMinutes: number;
  loading?: boolean;
  style?: ViewStyle;
}

function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function LearningTimeCard({
  dailyMinutes,
  weeklyMinutes,
  monthlyMinutes,
  averageSessionMinutes,
  loading = false,
  style,
}: LearningTimeCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading learning time">
        <Skeleton width={120} height={22} style={{ marginBottom: spacing.md }} />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height={18} style={{ marginBottom: spacing.sm }} />
        ))}
      </Card>
    );
  }

  const rows: Array<{ label: string; minutes: number; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
    { label: 'Today', minutes: dailyMinutes, icon: 'time-outline' },
    { label: 'This Week', minutes: weeklyMinutes, icon: 'calendar-outline' },
    { label: 'This Month', minutes: monthlyMinutes, icon: 'calendar-outline' },
  ];

  return (
    <Card
      style={style}
      accessibilityLabel={`Learning time: Today ${formatMinutes(dailyMinutes)}, this week ${formatMinutes(weeklyMinutes)}, this month ${formatMinutes(monthlyMinutes)}, average session ${formatMinutes(averageSessionMinutes)}`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Learning Time</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name={row.icon} size={18} color={themeColors.textMuted} />
            <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>{row.label}</Text>
          </View>
          <Text style={[styles.rowValue, { color: themeColors.text }]}>{formatMinutes(row.minutes)}</Text>
        </View>
      ))}
      <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Ionicons name="timer-outline" size={18} color={themeColors.textMuted} />
          <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>Average Session</Text>
        </View>
        <Text style={[styles.rowValue, { color: themeColors.text }]}>{formatMinutes(averageSessionMinutes)}</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.sizes.body,
  },
  rowValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
});

export default LearningTimeCard;
