import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { ProgressIndicator } from '../design/ProgressIndicator';
import { colors, progressSizes, spacing } from '../../theme';
import { MetricCard } from './MetricCard';

/**
 * Modules and lessons through the current curriculum.
 *
 * Both bars used to be hand-rolled track/fill pairs with their own percentage
 * text and their own "3/8" caption — the same markup twice in one file, and a
 * third variant of a progress bar in an app that already had one. They are now
 * the shared `ProgressIndicator`, which also carries the progressbar role and
 * value that the hand-rolled ones never announced.
 */

interface CurriculumProgressCardProps {
  modulesCompleted: number;
  modulesTotal: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const percent = (done: number, total: number): number => (total > 0 ? (done / total) * 100 : 0);

export function CurriculumProgressCard({
  modulesCompleted,
  modulesTotal,
  lessonsCompleted,
  lessonsTotal,
  loading = false,
  style,
}: CurriculumProgressCardProps) {
  return (
    <MetricCard
      title="Curriculum Progress"
      icon="book"
      loading={loading}
      style={style}
      accessibilityLabel={`${modulesCompleted} of ${modulesTotal} modules and ${lessonsCompleted} of ${lessonsTotal} lessons complete.`}
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton width="60%" height={14} />
          <Skeleton variant="rect" width="100%" height={progressSizes.barHeight} />
          <Skeleton width="60%" height={14} style={styles.skeletonGap} />
          <Skeleton variant="rect" width="100%" height={progressSizes.barHeight} />
        </View>
      }
    >
      <ProgressIndicator
        value={percent(modulesCompleted, modulesTotal)}
        label="Modules"
        countOf={{ current: modulesCompleted, total: modulesTotal }}
        color={colors.secondary}
        accessibilityLabel="Modules complete"
      />
      <ProgressIndicator
        value={percent(lessonsCompleted, lessonsTotal)}
        label="Lessons"
        countOf={{ current: lessonsCompleted, total: lessonsTotal }}
        color={colors.primary}
        style={styles.second}
        accessibilityLabel="Lessons complete"
      />
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.xs,
  },
  skeletonGap: {
    marginTop: spacing.md,
  },
  second: {
    marginTop: spacing.lg,
  },
});

export default CurriculumProgressCard;
