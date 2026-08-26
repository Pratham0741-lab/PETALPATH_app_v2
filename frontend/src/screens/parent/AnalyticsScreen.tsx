import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  useAnalyticsOverview,
  useAnalyticsActivity,
  useAnalyticsProgress,
  useLearningTrends,
} from '../../hooks/useParentAnalytics';
import { BarChart } from '../../components/charts/BarChart';
import { LineChart } from '../../components/charts/LineChart';
import {
  AppShell,
  Card,
  PageHeader,
  ParentRow,
  ProgressRing,
  SegmentedTabs,
} from '../../components/design';
import type { PetalIconName, SegmentedTabItem } from '../../components/design';
import {
  CompletionRateCard,
  ConsistencyCard,
  DataSection,
  LearningTimeCard,
  LearningVelocityCard,
  SkillDistributionCard,
} from '../../components/analytics';
import { colors, spacing, typography, progressSizes, breakpoints, layoutSizes } from '../../theme';
import type { OverviewMetrics, ActivitySeries } from '../../services/api/analyticsApi';

/**
 * Analytics (spec §26) — the long view of one child's learning.
 *
 * Same numbers, same hooks and the same three charts as before. What changed:
 * the seven totals are readable rows instead of a 130px column squeezed beside a
 * ring; the charts size themselves to the card rather than to
 * `screenWidth - spacing.lg * 4` (§27); and the five cards derived from the
 * overview query share its one error state instead of repeating it five times.
 * Showing five cards full of zeros under an error was the old behaviour and it
 * read as real data.
 */

type PeriodTab = 'daily' | 'weekly' | 'monthly';

const PERIOD_ITEMS: SegmentedTabItem<PeriodTab>[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

interface StatRow {
  label: string;
  value: string | number;
  icon: PetalIconName;
  color: string;
}

export const AnalyticsScreen: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();
  const isTabletOrDesktop = screenWidth >= breakpoints.mobileMax;

  const overview = useAnalyticsOverview();
  const activityDaily = useAnalyticsActivity('daily');
  const activityWeekly = useAnalyticsActivity('weekly');
  const activityMonthly = useAnalyticsActivity('monthly');
  const progress = useAnalyticsProgress();
  const learningTrends = useLearningTrends();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodTab>('weekly');

  const refreshAll = useCallback(async () => {
    await Promise.all([
      overview.refetch(),
      activityDaily.refetch(),
      activityWeekly.refetch(),
      activityMonthly.refetch(),
      progress.refetch(),
      learningTrends.refetch(),
    ]);
  }, [overview, activityDaily, activityWeekly, activityMonthly, progress, learningTrends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const overviewData: OverviewMetrics | undefined = overview.data?.data;

  const activityDataMap: Record<PeriodTab, ActivitySeries | undefined> = useMemo(
    () => ({
      daily: activityDaily.data?.data,
      weekly: activityWeekly.data?.data,
      monthly: activityMonthly.data?.data,
    }),
    [activityDaily.data?.data, activityWeekly.data?.data, activityMonthly.data?.data],
  );

  const activityLoadingMap: Record<PeriodTab, boolean> = useMemo(
    () => ({
      daily: activityDaily.isLoading,
      weekly: activityWeekly.isLoading,
      monthly: activityMonthly.isLoading,
    }),
    [activityDaily.isLoading, activityWeekly.isLoading, activityMonthly.isLoading],
  );

  const activityErrorMap: Record<PeriodTab, Error | null> = useMemo(
    () => ({
      daily: activityDaily.error,
      weekly: activityWeekly.error,
      monthly: activityMonthly.error,
    }),
    [activityDaily.error, activityWeekly.error, activityMonthly.error],
  );

  const activityRefetchMap: Record<PeriodTab, () => void> = useMemo(
    () => ({
      daily: () => activityDaily.refetch(),
      weekly: () => activityWeekly.refetch(),
      monthly: () => activityMonthly.refetch(),
    }),
    [activityDaily, activityWeekly, activityMonthly],
  );

  const currentActivityLoading = activityLoadingMap[selectedPeriod];
  const currentActivityError = activityErrorMap[selectedPeriod];
  const currentActivityRefetch = activityRefetchMap[selectedPeriod];

  const barChartData = useMemo(
    () =>
      activityDataMap[selectedPeriod]?.buckets.map((b) => ({
        label: b.label,
        value: b.total,
      })) ?? [],
    [activityDataMap, selectedPeriod],
  );

  const lessonTrendData = useMemo(
    () =>
      progress.data?.data?.lessonTrend.map((p) => ({
        label: p.date,
        value: p.count,
      })) ?? [],
    [progress.data],
  );

  const statsRows: StatRow[] = useMemo(
    () => [
      { label: 'Lessons Completed', value: overviewData?.lessonsCompleted ?? 0, icon: 'check', color: colors.successDark },
      { label: 'Lessons Started', value: overviewData?.lessonsStarted ?? 0, icon: 'play', color: colors.secondary },
      { label: 'Learning Minutes', value: overviewData?.totalLearningMinutes ?? 0, icon: 'clock', color: colors.primary },
      { label: 'Avg Assessment Score', value: overviewData ? `${Math.round(overviewData.averageAssessmentScore)}%` : '0%', icon: 'medal', color: colors.accent },
      { label: 'Total Stars', value: overviewData?.totalStars ?? 0, icon: 'star', color: colors.yellow },
      { label: 'Badges', value: overviewData?.totalBadges ?? 0, icon: 'trophy', color: colors.lavender },
      { label: 'Stickers', value: overviewData?.totalStickers ?? 0, icon: 'sparkle', color: colors.peach },
    ],
    [overviewData],
  );

  const completionPercentage = overviewData?.completionPercentage ?? 0;
  const displayMinutes = overviewData?.totalLearningMinutes ?? 0;

  /**
   * Five of the cards below are all derived from `overview`. When that query
   * fails, or settles with nothing, they have nothing to say — so they stand
   * down and the Overview section carries the one error and the one retry.
   */
  const showDerived = !overview.error && (overview.isLoading || !!overviewData);

  return (
    <AppShell
      petals="light"
      header={<PageHeader title="Analytics" subtitle="Totals, activity and trend" centered={false} />}
      contentContainerStyle={isTabletOrDesktop ? styles.contentTablet : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <DataSection
        title="Overview"
        icon="chart"
        boxed
        loading={overview.isLoading}
        error={overview.error}
        errorTitle="Could not load analytics"
        onRetry={() => overview.refetch()}
        empty={!overviewData}
        emptyTitle="No data yet"
        emptyMessage="Complete lessons to see analytics."
        emptyIcon="chart"
      >
        <View style={styles.ringWrap}>
          <ProgressRing
            value={completionPercentage}
            size={progressSizes.ringSizeLarge}
            stroke={progressSizes.ringStrokeLarge}
            color={colors.primary}
            accessibilityLabel={`${Math.round(completionPercentage)} percent of the curriculum complete`}
          >
            <Text style={[typography.presets.stat, styles.ringValue]}>
              {Math.round(completionPercentage)}%
            </Text>
          </ProgressRing>
          <Text style={[typography.presets.caption, styles.muted]}>Complete</Text>
        </View>

        {statsRows.map((stat, i) => (
          <ParentRow
            key={stat.label}
            label={stat.label}
            value={String(stat.value)}
            icon={stat.icon}
            iconColor={stat.color}
            divided={i > 0}
          />
        ))}
      </DataSection>

      <DataSection
        title="Activity"
        icon="calendar"
        loading={currentActivityLoading}
        error={currentActivityError}
        errorTitle="Could not load activity"
        onRetry={currentActivityRefetch}
        empty={barChartData.length === 0}
        emptyTitle="No activity data"
        emptyMessage="Activity will appear once lessons are completed."
        emptyIcon="calendar"
        controls={
          <SegmentedTabs
            items={PERIOD_ITEMS}
            selected={selectedPeriod}
            onSelect={setSelectedPeriod}
            accessibilityLabel="Activity period"
          />
        }
      >
        <Card>
          <BarChart data={barChartData} height={200} animated loading={currentActivityLoading} />
        </Card>
      </DataSection>

      {showDerived ? (
        <>
          <LearningTimeCard
            style={styles.card}
            loading={overview.isLoading}
            dailyMinutes={Math.round(displayMinutes / 30)}
            weeklyMinutes={Math.round(displayMinutes / 4)}
            monthlyMinutes={displayMinutes}
            averageSessionMinutes={Math.round(
              displayMinutes / Math.max(overviewData?.lessonsCompleted ?? 1, 1),
            )}
          />

          <SkillDistributionCard
            style={styles.card}
            loading={overview.isLoading}
            masteryGroups={[
              {
                label: 'Beginner',
                count: Math.max(
                  0,
                  (overviewData?.lessonsStarted ?? 0) - (overviewData?.lessonsCompleted ?? 0),
                ),
                color: colors.warning,
              },
              { label: 'Completed', count: overviewData?.lessonsCompleted ?? 0, color: colors.success },
            ]}
          />

          <CompletionRateCard
            style={styles.card}
            loading={overview.isLoading}
            rate={completionPercentage}
            trend={completionPercentage >= 70 ? 'up' : completionPercentage >= 40 ? 'stable' : 'down'}
            change={Math.round(completionPercentage / 10)}
          />

          <ConsistencyCard
            style={styles.card}
            loading={overview.isLoading}
            score={completionPercentage}
            currentStreak={Math.max(
              0,
              (overviewData?.lessonsCompleted ?? 0) - (overviewData?.lessonsStarted ?? 0) + 1,
            )}
            longestStreak={Math.max(1, overviewData?.lessonsCompleted ?? 0)}
          />

          <LearningVelocityCard
            style={styles.card}
            loading={overview.isLoading || learningTrends.isLoading}
            velocity={Math.max(1, Math.round(((overviewData?.lessonsCompleted ?? 0) / 7) * 7))}
            trend={completionPercentage >= 50 ? 'up' : completionPercentage >= 25 ? 'stable' : 'down'}
          />
        </>
      ) : null}

      <DataSection
        title="Learning Trend"
        icon="chart"
        loading={progress.isLoading}
        error={progress.error}
        errorTitle="Could not load trend"
        onRetry={() => progress.refetch()}
        empty={lessonTrendData.length === 0}
        emptyTitle="No trend data"
        emptyMessage="Trend will appear after completing lessons."
        emptyIcon="chart"
      >
        <Card>
          <LineChart
            data={lessonTrendData}
            height={220}
            color={colors.primary}
            animated
            loading={progress.isLoading}
          />
        </Card>
      </DataSection>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  contentTablet: {
    maxWidth: layoutSizes.report,
    alignSelf: 'center',
    width: '100%',
  },
  muted: {
    color: colors.textSecondary,
  },
  card: {
    marginBottom: spacing.xl,
  },
  ringWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  ringValue: {
    color: colors.text,
  },
});

export default AnalyticsScreen;
