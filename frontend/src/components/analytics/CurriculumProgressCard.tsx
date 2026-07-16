import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';

interface CurriculumProgressCardProps {
  modulesCompleted: number;
  modulesTotal: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  loading?: boolean;
  style?: ViewStyle;
}

export function CurriculumProgressCard({
  modulesCompleted,
  modulesTotal,
  lessonsCompleted,
  lessonsTotal,
  loading = false,
  style,
}: CurriculumProgressCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading curriculum progress">
        <Skeleton width={150} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: spacing.xs }} />
        <Skeleton variant="rect" width="100%" height={10} style={{ marginBottom: spacing.lg, borderRadius: radius.xs }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: spacing.xs }} />
        <Skeleton variant="rect" width="100%" height={10} style={{ borderRadius: radius.xs }} />
      </Card>
    );
  }

  const modulesPercent = modulesTotal > 0 ? (modulesCompleted / modulesTotal) * 100 : 0;
  const lessonsPercent = lessonsTotal > 0 ? (lessonsCompleted / lessonsTotal) * 100 : 0;

  return (
    <Card
      style={style}
      accessibilityLabel={`Curriculum progress: ${modulesCompleted} of ${modulesTotal} modules, ${lessonsCompleted} of ${lessonsTotal} lessons`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Curriculum Progress</Text>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: themeColors.textSecondary }]}>Modules</Text>
          <Text style={[styles.progressPercent, { color: themeColors.text }]}>
            {Math.round(modulesPercent)}%
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: themeColors.surfaceSecondary }]}>
          <View style={[styles.fill, { width: `${modulesPercent}%`, backgroundColor: themeColors.secondary }]} />
        </View>
        <Text style={[styles.count, { color: themeColors.textMuted }]}>
          {modulesCompleted}/{modulesTotal}
        </Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: themeColors.textSecondary }]}>Lessons</Text>
          <Text style={[styles.progressPercent, { color: themeColors.text }]}>
            {Math.round(lessonsPercent)}%
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: themeColors.surfaceSecondary }]}>
          <View style={[styles.fill, { width: `${lessonsPercent}%`, backgroundColor: themeColors.primary }]} />
        </View>
        <Text style={[styles.count, { color: themeColors.textMuted }]}>
          {lessonsCompleted}/{lessonsTotal}
        </Text>
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
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  progressPercent: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  track: {
    height: 10,
    borderRadius: radius.xs,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  count: {
    fontSize: typography.sizes.caption,
  },
});

export default CurriculumProgressCard;
