import React, { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  useAnalyticsOverview,
  useAnalyticsActivity,
  useAnalyticsProgress,
  useLearningTrends,
} from '../../hooks/useParentAnalytics';
import { ProgressRing } from '../../components/charts/ProgressRing';
import { BarChart } from '../../components/charts/BarChart';
import { LineChart } from '../../components/charts/LineChart';
import { LearningTimeCard } from '../../components/analytics/LearningTimeCard';
import { SkillDistributionCard } from '../../components/analytics/SkillDistributionCard';
import { CompletionRateCard } from '../../components/analytics/CompletionRateCard';
import { ConsistencyCard } from '../../components/analytics/ConsistencyCard';
import { LearningVelocityCard } from '../../components/analytics/LearningVelocityCard';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { colors, spacing, typography, radius, breakpoints } from '../../theme';
import type { OverviewMetrics, ActivitySeries } from '../../services/api/analyticsApi';

type PeriodTab = 'daily' | 'weekly' | 'monthly';

const PERIOD_TABS: PeriodTab[] = ['daily', 'weekly', 'monthly'];

interface StatRow {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<{ goBack: () => void }>();
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

  const currentActivity = activityDataMap[selectedPeriod];
  const currentActivityLoading = activityLoadingMap[selectedPeriod];
  const currentActivityError = activityErrorMap[selectedPeriod];
  const currentActivityRefetch = activityRefetchMap[selectedPeriod];

  const barChartData = useMemo(
    () =>
      currentActivity?.buckets.map((b) => ({
        label: b.label,
        value: b.total,
      })) ?? [],
    [currentActivity],
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
      { label: 'Lessons Completed', value: overviewData?.lessonsCompleted ?? 0, icon: 'checkmark-circle', color: colors.success },
      { label: 'Lessons Started', value: overviewData?.lessonsStarted ?? 0, icon: 'play-circle', color: colors.secondary },
      { label: 'Learning Minutes', value: overviewData?.totalLearningMinutes ?? 0, icon: 'time', color: colors.primary },
      { label: 'Avg Assessment Score', value: overviewData ? `${Math.round(overviewData.averageAssessmentScore)}%` : '0%', icon: 'school', color: colors.accent },
      { label: 'Total Stars', value: overviewData?.totalStars ?? 0, icon: 'star', color: colors.yellow },
      { label: 'Badges', value: overviewData?.totalBadges ?? 0, icon: 'shield-checkmark', color: colors.lavender },
      { label: 'Stickers', value: overviewData?.totalStickers ?? 0, icon: 'happy', color: colors.peach },
    ],
    [overviewData],
  );

  const completionPercentage = overviewData?.completionPercentage ?? 0;

  const displayMinutes = overviewData?.totalLearningMinutes ?? 0;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isTabletOrDesktop && styles.scrollContainerTablet,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header} accessibilityRole="header">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Ionicons name="stats-chart" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>

        {/* Overview with ProgressRing */}
        <Card style={styles.section} accessibilityLabel="Learning overview">
          <Text style={styles.sectionTitle}>Overview</Text>
          {overview.isLoading ? (
            <View style={styles.overviewLoading}>
              <Skeleton variant="circle" width={120} height={120} />
              <View style={styles.overviewStatsLoading}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height={16} style={{ marginBottom: spacing.sm }} />
                ))}
              </View>
            </View>
          ) : overview.error ? (
            <ErrorState
              title="Could not load analytics"
              message={overview.error.message}
              onRetry={() => overview.refetch()}
            />
          ) : overviewData ? (
            <View style={styles.overviewContent}>
              <View style={styles.overviewRing}>
                <ProgressRing
                  progress={completionPercentage}
                  size={130}
                  strokeWidth={12}
                  label="Complete"
                />
              </View>
              <View style={styles.overviewStats}>
                {statsRows.map((stat) => (
                  <View key={stat.label} style={styles.statRow}>
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <EmptyState title="No data yet" message="Complete lessons to see analytics." />
          )}
        </Card>

        {/* Daily/Weekly/Monthly Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.periodTabs} accessibilityRole="tablist">
            {PERIOD_TABS.map((period) => {
              const isSelected = period === selectedPeriod;
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodTab, isSelected && styles.periodTabActive]}
                  onPress={() => setSelectedPeriod(period)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${period} view`}
                >
                  <Text style={[styles.periodTabLabel, isSelected && styles.periodTabLabelActive]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {currentActivityLoading ? (
            <Skeleton variant="card" />
          ) : currentActivityError ? (
            <ErrorState
              title="Could not load activity"
              message={currentActivityError.message}
              onRetry={currentActivityRefetch}
            />
          ) : currentActivity && barChartData.length > 0 ? (
            <Card style={styles.chartCard}>
              <BarChart data={barChartData} width={screenWidth - spacing.lg * 4} height={200} animated />
            </Card>
          ) : (
            <EmptyState title="No activity data" message="Activity will appear once lessons are completed." />
          )}
        </View>

        {/* Learning Time */}
        <View style={styles.section}>
          <LearningTimeCard
            dailyMinutes={Math.round(displayMinutes / 30)}
            weeklyMinutes={Math.round(displayMinutes / 4)}
            monthlyMinutes={displayMinutes}
            averageSessionMinutes={Math.round(displayMinutes / Math.max(overviewData?.lessonsCompleted ?? 1, 1))}
            loading={overview.isLoading}
          />
        </View>

        {/* Skill Distribution */}
        <View style={styles.section}>
          <SkillDistributionCard
            masteryGroups={[
              { label: 'Beginner', count: Math.max(0, (overviewData?.lessonsStarted ?? 0) - (overviewData?.lessonsCompleted ?? 0)), color: colors.warning },
              { label: 'Completed', count: overviewData?.lessonsCompleted ?? 0, color: colors.success },
            ]}
            loading={overview.isLoading}
          />
        </View>

        {/* Completion Rate */}
        <View style={styles.section}>
          {overview.isLoading ? (
            <CompletionRateCard rate={0} trend="stable" change={0} loading />
          ) : overview.error ? (
            <ErrorState
              title="Could not load completion rate"
              message={overview.error.message}
              onRetry={() => overview.refetch()}
            />
          ) : overviewData ? (
            <CompletionRateCard
              rate={completionPercentage}
              trend={completionPercentage >= 70 ? 'up' : completionPercentage >= 40 ? 'stable' : 'down'}
              change={Math.round(completionPercentage / 10)}
            />
          ) : (
            <EmptyState title="No completion data" message="Complete lessons to track your rate." />
          )}
        </View>

        {/* Consistency */}
        <View style={styles.section}>
          {overview.isLoading ? (
            <ConsistencyCard score={0} currentStreak={0} longestStreak={0} loading />
          ) : overview.error ? (
            <ErrorState
              title="Could not load consistency"
              message={overview.error.message}
              onRetry={() => overview.refetch()}
            />
          ) : overviewData ? (
            <ConsistencyCard
              score={completionPercentage}
              currentStreak={Math.max(0, overviewData.lessonsCompleted - overviewData.lessonsStarted + 1)}
              longestStreak={Math.max(1, overviewData.lessonsCompleted)}
            />
          ) : (
            <EmptyState title="No consistency data" message="Start learning to build a streak." />
          )}
        </View>

        {/* Learning Velocity */}
        <View style={styles.section}>
          {overview.isLoading || learningTrends.isLoading ? (
            <LearningVelocityCard velocity={0} trend="stable" loading />
          ) : overview.error ? (
            <ErrorState
              title="Could not load velocity"
              message={overview.error.message}
              onRetry={() => overview.refetch()}
            />
          ) : overviewData ? (
            <LearningVelocityCard
              velocity={Math.max(1, Math.round((overviewData.lessonsCompleted / 7) * 7))}
              trend={completionPercentage >= 50 ? 'up' : completionPercentage >= 25 ? 'stable' : 'down'}
            />
          ) : (
            <EmptyState title="No velocity data" message="Complete lessons to see your pace." />
          )}
        </View>

        {/* Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Trend</Text>
          {progress.isLoading ? (
            <Skeleton variant="card" />
          ) : progress.error ? (
            <ErrorState
              title="Could not load trend"
              message={progress.error.message}
              onRetry={() => progress.refetch()}
            />
          ) : lessonTrendData.length > 0 ? (
            <Card style={styles.chartCard}>
              <LineChart
                data={lessonTrendData}
                width={screenWidth - spacing.lg * 4}
                height={220}
                color={colors.primary}
                animated
              />
            </Card>
          ) : (
            <EmptyState title="No trend data" message="Trend will appear after completing lessons." />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  scrollContainerTablet: {
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  overviewLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  overviewStatsLoading: {
    flex: 1,
  },
  overviewContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  overviewRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewStats: {
    flex: 1,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  periodTabActive: {
    backgroundColor: colors.primary,
  },
  periodTabLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  periodTabLabelActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  chartCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
