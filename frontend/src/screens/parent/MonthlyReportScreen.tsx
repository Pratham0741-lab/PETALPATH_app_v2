import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAnalyticsActivity, useMonthlyReport } from '../../hooks/useParentAnalytics';
import { BarChart } from '../../components/charts/BarChart';
import {
  AppShell,
  Card,
  PageHeader,
  ParentRow,
  ParentSection,
  PetalIcon,
  ProgressIndicator,
  ProgressRing,
  SecondaryButton,
  StatGrid,
} from '../../components/design';
import type { PetalIconName, Stat } from '../../components/design';
import { ConsistencyCard, DataSection } from '../../components/analytics';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { breakpoints, colors, progressSizes, spacing, typography, layoutSizes } from '../../theme';
import { formatDuration } from '../../utils/formatters';
import type { MonthlyReport } from '../../services/api/analyticsApi';

/**
 * Monthly Report (spec §26) — the same figures as before, told once each.
 *
 * The old screen printed Lessons, Modules and Activities in a four-tile stat row
 * and then again in a "Content Completed" card, and fed
 * `CurriculumProgressCard` `modulesTotal={Math.max(modulesCompleted, 1)}` — a
 * ratio that is 100% by construction, so the card always read "complete". The
 * report's real `curriculumProgress` percentage was never drawn at all. It is the
 * progress bar at the top of this version, and the totals now appear once: the
 * summary grid up top, the per-content-type breakdown below it.
 *
 * Also: the chart fills its card instead of `screenWidth - spacing.lg * 4` (§27),
 * and the one Export control sits at the foot rather than as a filled pink button
 * competing with the page title.
 */

interface Comparison {
  label: string;
  icon: PetalIconName;
  value: number;
  suffix?: string;
}

export const MonthlyReportScreen: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();
  const isTabletOrDesktop = screenWidth >= breakpoints.mobileMax;

  const report = useMonthlyReport();
  const activity = useAnalyticsActivity('monthly');

  const [refreshing, setRefreshing] = useState(false);

  const reportData: MonthlyReport | undefined = report.data?.data;

  const refreshAll = useCallback(async () => {
    await Promise.all([report.refetch(), activity.refetch()]);
  }, [report, activity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const barChartData = useMemo(
    () =>
      activity.data?.data?.buckets.map((b) => ({
        label: b.label,
        value: b.total,
      })) ?? [],
    [activity.data],
  );

  const handleExport = useCallback(() => {
    Alert.alert('Export', 'Export functionality coming soon.');
  }, []);

  const stats: Stat[] = useMemo(
    () => [
      {
        label: 'Learning',
        value: reportData ? formatDuration(reportData.totalLearningMinutes) : '0m',
        icon: 'clock',
        color: colors.primary,
      },
      { label: 'Lessons', value: String(reportData?.lessonsCompleted ?? 0), icon: 'check', color: colors.successDark },
      { label: 'Modules', value: String(reportData?.contentCompleted.modules ?? 0), icon: 'explore', color: colors.secondary },
      { label: 'Activities', value: String(reportData?.contentCompleted.activities ?? 0), icon: 'play', color: colors.accent },
    ],
    [reportData],
  );

  const comparisons: Comparison[] = useMemo(
    () => [
      { label: 'Lessons', icon: 'book', value: reportData?.previousMonthComparison.lessonsChange ?? 0 },
      { label: 'Minutes', icon: 'clock', value: reportData?.previousMonthComparison.minutesChange ?? 0 },
      { label: 'Mastery', icon: 'medal', value: reportData?.previousMonthComparison.masteryChange ?? 0, suffix: '%' },
    ],
    [reportData],
  );

  const header = (
    <PageHeader
      title="Monthly Report"
      subtitle={reportData?.month ?? 'The last four weeks'}
      centered={false}
    />
  );

  if (report.isLoading) {
    return (
      <AppShell petals="light" header={header}>
        <Skeleton variant="card" height={168} style={styles.block} />
        <Skeleton variant="card" height={200} style={styles.block} />
        <Skeleton variant="card" height={220} style={styles.block} />
      </AppShell>
    );
  }

  if (report.error && !reportData) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <ErrorState
            title="Could not load monthly report"
            message={report.error.message}
            onRetry={() => report.refetch()}
          />
        </StatePanel>
      </AppShell>
    );
  }

  if (!reportData) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <EmptyState
            icon="calendar"
            title="No report yet"
            message="Complete lessons this month to see your report."
          />
        </StatePanel>
      </AppShell>
    );
  }

  return (
    <AppShell
      petals="light"
      header={header}
      contentContainerStyle={isTabletOrDesktop ? styles.contentTablet : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ParentSection title="This Month" icon="calendar" boxed>
        <StatGrid stats={stats} />
        <ProgressIndicator
          label="Curriculum progress"
          value={reportData.curriculumProgress}
          color={colors.primary}
          showPercentage
          style={styles.curriculumBar}
        />
      </ParentSection>

      <ParentSection title="Mastery Growth" subtitle="How much stronger this month made things" icon="medal" boxed>
        <View style={styles.ringWrap}>
          <ProgressRing
            value={reportData.masteryGrowth}
            size={progressSizes.ringSizeLarge}
            stroke={progressSizes.ringStrokeLarge}
            color={colors.secondary}
            accessibilityLabel={`Mastery growth ${Math.round(reportData.masteryGrowth)} percent`}
          >
            <Text style={[typography.presets.stat, styles.ringValue]}>
              {Math.round(reportData.masteryGrowth)}%
            </Text>
          </ProgressRing>
          <Text style={[typography.presets.caption, styles.muted]}>Growth</Text>
        </View>
      </ParentSection>

      <ConsistencyCard
        score={reportData.consistency}
        currentStreak={Math.round(reportData.consistency / 10)}
        longestStreak={Math.round(reportData.consistency / 8)}
        style={styles.block}
      />

      <ParentSection title="Content Completed" icon="book" boxed>
        <ParentRow
          label="Lessons"
          value={String(reportData.contentCompleted.lessons)}
          icon="book"
          iconColor={colors.secondary}
        />
        <ParentRow
          label="Modules"
          value={String(reportData.contentCompleted.modules)}
          icon="explore"
          iconColor={colors.successDark}
          divided
        />
        <ParentRow
          label="Activities"
          value={String(reportData.contentCompleted.activities)}
          icon="play"
          iconColor={colors.accent}
          divided
        />
      </ParentSection>

      <ParentSection title="vs Last Month" icon="chart" boxed>
        {comparisons.map((c, i) => (
          <ParentRow
            key={c.label}
            label={c.label}
            icon={c.icon}
            iconColor={colors.textSecondary}
            divided={i > 0}
            right={<ChangePill value={c.value} suffix={c.suffix} label={c.label} />}
          />
        ))}
      </ParentSection>

      <DataSection
        title="Achievements"
        icon="trophy"
        boxed
        empty={reportData.achievements.length === 0}
        emptyTitle="No achievements yet"
        emptyMessage="Keep learning to earn achievements."
        emptyIcon="trophy"
      >
        {reportData.achievements.map((ach, i) => (
          <View key={`ach-${i}`} style={styles.listRow}>
            <PetalIcon name="trophy" size={18} color={colors.accent} />
            <Text style={[typography.presets.body, styles.listText]}>{ach}</Text>
          </View>
        ))}
      </DataSection>

      <DataSection
        title="Recommendations"
        icon="sparkle"
        boxed
        empty={reportData.recommendations.length === 0}
        emptyTitle="No recommendations"
        emptyMessage="Recommendations will appear based on learning patterns."
        emptyIcon="sparkle"
      >
        {reportData.recommendations.map((rec, i) => (
          <View key={`rec-${i}`} style={styles.listRow}>
            <PetalIcon name="check" size={16} color={colors.primary} />
            <Text style={[typography.presets.body, styles.listText]}>{rec}</Text>
          </View>
        ))}
      </DataSection>

      <DataSection
        title="Monthly Activity"
        icon="chart"
        loading={activity.isLoading}
        error={activity.error}
        errorTitle="Could not load activity chart"
        onRetry={() => activity.refetch()}
        empty={barChartData.length === 0}
        emptyTitle="No activity data"
        emptyMessage="Activity chart will appear once lessons are logged."
        emptyIcon="calendar"
      >
        <Card>
          <BarChart
            data={barChartData}
            height={220}
            animated
            showValues
            loading={activity.isLoading}
          />
        </Card>
      </DataSection>

      <SecondaryButton
        label="Export Report"
        icon="arrowDown"
        onPress={handleExport}
        accessibilityLabel="Export report"
        accessibilityHint="Export is not available yet"
        style={styles.export}
      />
    </AppShell>
  );
};

/**
 * A month-on-month change. The sign, the word and the arrow all carry the
 * direction, so the colour is the last of four cues rather than the only one
 * (§30). The pill speaks as one phrase instead of four separate fragments.
 */
const ChangePill: React.FC<{ value: number; suffix?: string; label: string }> = ({
  value,
  suffix = '',
  label,
}) => {
  const up = value >= 0;
  const tint = up ? colors.successDark : colors.errorDark;
  const display = `${up ? '+' : ''}${value}${suffix}`;

  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLabel={`${label}: ${display} ${up ? 'more' : 'fewer'} than last month`}
    >
      <Text style={[typography.presets.caption, styles.pillText, { color: tint }]}>{display}</Text>
      <PetalIcon name={up ? 'arrowUp' : 'arrowDown'} size={14} color={tint} />
    </View>
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
  contentTablet: {
    maxWidth: layoutSizes.report,
    alignSelf: 'center',
    width: '100%',
  },
  block: {
    marginBottom: spacing.xl,
  },
  panel: {
    minHeight: 220,
    paddingVertical: spacing.md,
  },
  muted: {
    color: colors.textSecondary,
  },

  // ------------------------------------------------------------------ summary
  curriculumBar: {
    marginTop: spacing.lg,
  },
  ringWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  ringValue: {
    color: colors.text,
  },

  // -------------------------------------------------------------- text lists
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  listText: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    lineHeight: 22,
  },

  // ------------------------------------------------------------- comparisons
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pillText: {
    fontWeight: '800',
  },

  export: {
    marginTop: spacing.sm,
  },
});

export default MonthlyReportScreen;
