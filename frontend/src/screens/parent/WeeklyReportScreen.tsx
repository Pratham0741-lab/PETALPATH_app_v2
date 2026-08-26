import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAnalyticsActivity, useWeeklyReport } from '../../hooks/useParentAnalytics';
import { BarChart } from '../../components/charts/BarChart';
import {
  AppShell,
  Card,
  PageHeader,
  ParentRow,
  ParentSection,
  PetalIcon,
  ProgressIndicator,
  SecondaryButton,
  StatGrid,
} from '../../components/design';
import type { Stat } from '../../components/design';
import { DataSection, LearningTrendCard } from '../../components/analytics';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { colors, progressSizes, spacing, typography } from '../../theme';
import { formatDuration } from '../../utils/formatters';

/**
 * Weekly Report (spec §26) — one week of learning on a single page.
 *
 * The week range moves into the page subtitle instead of a card of its own, the
 * four totals become a `StatGrid` (they were a `space-between` row of 72px
 * columns that crowded at 360px), and the two Export buttons — one in the header,
 * one at the foot, both opening the same "coming soon" alert — become one.
 *
 * The chart no longer measures itself against `screenWidth - spacing.lg * 4`; it
 * fills its card (§27). It also has its own section state now: the activity
 * query is separate from the report query, so when it fails the page says so and
 * offers a retry rather than drawing an empty axis.
 */

/** Placeholder until report export ships — unchanged from the previous screen. */
const EXPORT_MESSAGE = 'Report export will be available in a future update.';

export const WeeklyReportScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const { data: reportData, isLoading, isError, error, refetch } = useWeeklyReport();

  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useAnalyticsActivity('weekly');

  const report = useMemo(() => reportData?.data ?? null, [reportData]);

  const activityBuckets = useMemo(() => activityData?.data?.buckets ?? [], [activityData]);

  const chartData = useMemo(
    () =>
      activityBuckets.map((b) => ({
        label: b.label,
        value: b.lessonCompletions,
      })),
    [activityBuckets],
  );

  const weekRange = useMemo(() => {
    if (!report) return '';
    const start = new Date(report.weekStart);
    const end = new Date(report.weekEnd);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtDay = (d: Date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
    };
    return `${fmtDay(start)} – ${fmtDay(end)}, ${end.getFullYear()}`;
  }, [report]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchActivity()]);
    setRefreshing(false);
  }, [refetch, refetchActivity]);

  const handleExport = useCallback(() => {
    Alert.alert('Export', EXPORT_MESSAGE);
  }, []);

  const stats: Stat[] = useMemo(
    () => [
      {
        label: 'Learning',
        value: report ? formatDuration(report.totalLearningMinutes) : '0m',
        icon: 'clock',
        color: colors.primary,
      },
      { label: 'Lessons', value: String(report?.lessonsCompleted ?? 0), icon: 'check', color: colors.successDark },
      { label: 'Activities', value: String(report?.activitiesCompleted ?? 0), icon: 'play', color: colors.accent },
      { label: 'Modules', value: String(report?.modulesCompleted ?? 0), icon: 'book', color: colors.lavender },
    ],
    [report],
  );

  const header = (
    <PageHeader
      title="Weekly Report"
      subtitle={weekRange || 'The last seven days'}
      centered={false}
    />
  );

  if (isLoading) {
    return (
      <AppShell petals="light" header={header}>
        <Skeleton variant="card" height={132} style={styles.block} />
        <Skeleton variant="card" height={160} style={styles.block} />
        <Skeleton variant="card" height={220} style={styles.block} />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <ErrorState
            title="Couldn't load weekly report"
            message={(error as Error)?.message ?? 'An error occurred loading the weekly report.'}
            onRetry={() => refetch()}
          />
        </StatePanel>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <EmptyState
            icon="calendar"
            title="No report available"
            message="Complete more lessons this week to generate a report."
          />
        </StatePanel>
      </AppShell>
    );
  }

  return (
    <AppShell
      petals="light"
      header={header}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ParentSection title="This Week" icon="calendar" boxed>
        <StatGrid stats={stats} />
        <ParentRow
          label="Skills Improved"
          value={String(report.skillsImproved)}
          icon="chart"
          iconColor={colors.successDark}
          divided
          style={styles.improvedRow}
        />
      </ParentSection>

      {report.weakSkills.length > 0 ? (
        <ParentSection title="Weak Skills" subtitle="Worth a little extra practice" icon="warning" boxed={false}>
          <Card accent={colors.warning} rail>
            {report.weakSkills.map((skill, i) => (
              <ProgressIndicator
                key={skill.name}
                label={skill.name}
                value={skill.score}
                height={progressSizes.barHeightThin}
                color={skill.score < 30 ? colors.error : colors.warning}
                showPercentage
                style={i > 0 ? styles.weakRow : undefined}
                accessibilityLabel={`${skill.name}, ${Math.round(skill.score)} percent`}
              />
            ))}
          </Card>
        </ParentSection>
      ) : null}

      <LearningTrendCard
        trend={report.trend}
        changePercent={report.skillsImproved}
        style={styles.block}
      />

      {report.recommendations.length > 0 ? (
        <ParentSection title="Recommendations" icon="sparkle" boxed>
          {report.recommendations.map((rec, idx) => (
            <View key={`rec-${idx}`} style={styles.recRow}>
              <PetalIcon name="check" size={16} color={colors.primary} />
              <Text style={[typography.presets.body, styles.recText]}>{rec}</Text>
            </View>
          ))}
        </ParentSection>
      ) : null}

      <DataSection
        title="Daily Lesson Completions"
        icon="chart"
        loading={activityLoading}
        error={activityError}
        errorTitle="Could not load daily activity"
        onRetry={() => refetchActivity()}
        empty={chartData.length === 0}
        emptyTitle="Nothing completed yet"
        emptyMessage="Finished lessons show up here day by day."
        emptyIcon="calendar"
      >
        <Card>
          <BarChart data={chartData} height={180} animated loading={activityLoading} showValues />
        </Card>
      </DataSection>

      <SecondaryButton
        label="Export Report"
        icon="arrowDown"
        onPress={handleExport}
        accessibilityLabel="Export full report"
        accessibilityHint="Export is not available yet"
        style={styles.export}
      />
    </AppShell>
  );
};

/**
 * `EmptyState` and `ErrorState` centre themselves with `flex: 1`, which collapses
 * inside a scroll view's auto-height content — the minimum height gives it room.
 */
const StatePanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card variant="flat" padding="none">
    <View style={styles.panel}>{children}</View>
  </Card>
);

const styles = StyleSheet.create({
  block: {
    marginBottom: spacing.xl,
  },
  panel: {
    minHeight: 220,
    paddingVertical: spacing.md,
  },
  improvedRow: {
    marginTop: spacing.md,
  },
  weakRow: {
    marginTop: spacing.md,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recText: {
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
    // The tick sits on the first line of a wrapping sentence, so the text keeps
    // its own line height rather than being pushed down to match the icon.
    lineHeight: 22,
  },
  export: {
    marginTop: spacing.sm,
  },
});

export default WeeklyReportScreen;
