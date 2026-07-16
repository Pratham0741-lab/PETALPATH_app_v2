import React, { useCallback, useState } from 'react';
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
import { useChildStore } from '../../store/childStore';
import {
  useAnalyticsOverview,
  useAnalyticsActivity,
  useCurriculumInsights,
  useAnalyticsRewards,
} from '../../hooks/useParentAnalytics';
import { ProgressSummaryCard } from '../../components/analytics/ProgressSummaryCard';
import { CurriculumProgressCard } from '../../components/analytics/CurriculumProgressCard';
import { WeeklyLearningCard } from '../../components/analytics/WeeklyLearningCard';
import { MonthlyLearningCard } from '../../components/analytics/MonthlyLearningCard';
import { ConsistencyCard } from '../../components/analytics/ConsistencyCard';
import { LearningTimeCard } from '../../components/analytics/LearningTimeCard';
import { BarChart } from '../../components/charts/BarChart';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { colors, spacing, typography, radius, shadows, breakpoints } from '../../theme';
import type { OverviewMetrics, ActivitySeries, CurriculumInsight, RewardsSummary } from '../../services/api/analyticsApi';

type PeriodTab = 'daily' | 'weekly' | 'monthly';

const PERIOD_TABS: PeriodTab[] = ['daily', 'weekly', 'monthly'];

interface QuickLink {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  screen: string;
}

const QUICK_LINKS: QuickLink[] = [
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart', screen: 'Analytics' },
  { key: 'skillMastery', label: 'Skill Mastery', icon: 'school', screen: 'Mastery' },
  { key: 'learningHistory', label: 'Learning History', icon: 'time', screen: 'LearningHistory' },
  { key: 'weeklyReport', label: 'Weekly Report', icon: 'calendar', screen: 'WeeklyReport' },
  { key: 'monthlyReport', label: 'Monthly Report', icon: 'calendar', screen: 'MonthlyReport' },
  { key: 'curriculum', label: 'Curriculum Insights', icon: 'book', screen: 'CurriculumExplorer' },
];

export const ParentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<{ navigate: (screen: string, params?: Record<string, unknown>) => void }>();
  const { width: screenWidth } = useWindowDimensions();
  const isTabletOrDesktop = screenWidth >= breakpoints.mobileMax;

  const activeChild = useChildStore((s) => s.activeChild);
  const refreshChildren = useChildStore((s) => s.refreshChildren);

  const overview = useAnalyticsOverview();
  const activityDaily = useAnalyticsActivity('daily');
  const activityWeekly = useAnalyticsActivity('weekly');
  const activityMonthly = useAnalyticsActivity('monthly');
  const curriculum = useCurriculumInsights();
  const rewards = useAnalyticsRewards();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodTab>('daily');

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshChildren(),
      overview.refetch(),
      activityDaily.refetch(),
      activityWeekly.refetch(),
      activityMonthly.refetch(),
      curriculum.refetch(),
      rewards.refetch(),
    ]);
  }, [refreshChildren, overview, activityDaily, activityWeekly, activityMonthly, curriculum, rewards]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const overviewData: OverviewMetrics | undefined = overview.data?.data;
  const curriculumData: CurriculumInsight | undefined = curriculum.data?.data;
  const rewardsData: RewardsSummary | undefined = rewards.data?.data;

  const activityDataMap: Record<PeriodTab, ActivitySeries | undefined> = {
    daily: activityDaily.data?.data,
    weekly: activityWeekly.data?.data,
    monthly: activityMonthly.data?.data,
  };
  const activityLoadingMap: Record<PeriodTab, boolean> = {
    daily: activityDaily.isLoading,
    weekly: activityWeekly.isLoading,
    monthly: activityMonthly.isLoading,
  };
  const activityErrorMap: Record<PeriodTab, Error | null> = {
    daily: activityDaily.error,
    weekly: activityWeekly.error,
    monthly: activityMonthly.error,
  };
  const activityRefetchMap: Record<PeriodTab, () => void> = {
    daily: () => activityDaily.refetch(),
    weekly: () => activityWeekly.refetch(),
    monthly: () => activityMonthly.refetch(),
  };

  const currentActivity = activityDataMap[selectedPeriod];
  const currentActivityLoading = activityLoadingMap[selectedPeriod];
  const currentActivityError = activityErrorMap[selectedPeriod];
  const currentActivityRefetch = activityRefetchMap[selectedPeriod];

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
        <View style={styles.header} accessibilityRole="header">
          <Ionicons name="bar-chart" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>Parent Dashboard</Text>
        </View>

        <Card style={styles.section} accessibilityLabel="Child overview">
          <Text style={styles.sectionTitle}>Child Overview</Text>
          {activeChild ? (
            <View style={styles.childRow}>
              <Ionicons name="person-circle" size={48} color={colors.primary} />
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{activeChild.name}</Text>
                <Text style={styles.childDetail}>
                  Age {activeChild.age}
                  {activeChild.ageGroup ? ` \u00B7 ${activeChild.ageGroup}` : ''}
                </Text>
              </View>
            </View>
          ) : (
            <EmptyState title="No child selected" message="Select a child to view their dashboard." />
          )}
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Completion</Text>
          {overview.isLoading ? (
            <Skeleton variant="card" />
          ) : overview.error ? (
            <ErrorState
              title="Could not load completion data"
              message={overview.error.message}
              onRetry={() => overview.refetch()}
            />
          ) : overviewData ? (
            <ProgressSummaryCard
              completionPercentage={overviewData.completionPercentage}
              lessonsCompleted={overviewData.lessonsCompleted}
            />
          ) : (
            <EmptyState title="No data yet" message="Complete lessons to see progress." />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Curriculum</Text>
          {curriculum.isLoading ? (
            <Skeleton variant="card" />
          ) : curriculum.error ? (
            <ErrorState
              title="Could not load curriculum"
              message={curriculum.error.message}
              onRetry={() => curriculum.refetch()}
            />
          ) : curriculumData ? (
            <CurriculumProgressCard
              modulesCompleted={curriculumData.modulesCompleted}
              modulesTotal={curriculumData.modulesCompleted + curriculumData.modulesRemaining}
              lessonsCompleted={curriculumData.lessonsCompleted}
              lessonsTotal={curriculumData.lessonsCompleted + curriculumData.lessonsRemaining}
            />
          ) : (
            <EmptyState title="No curriculum data" message="Curriculum insights will appear here." />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
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
          ) : currentActivity ? (
            <>
              {selectedPeriod === 'weekly' ? (
                <WeeklyLearningCard buckets={currentActivity.buckets} />
              ) : selectedPeriod === 'monthly' ? (
                <MonthlyLearningCard buckets={currentActivity.buckets} />
              ) : null}
              <View style={styles.chartContainer}>
                <BarChart data={currentActivity.buckets.map((b) => ({ label: b.label, value: b.total }))} />
              </View>
            </>
          ) : (
            <EmptyState title="No activity data" message="Activity data will appear once lessons are completed." />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Streak</Text>
          {overview.isLoading ? (
            <Skeleton variant="card" />
          ) : overview.error ? (
            <ErrorState
              title="Could not load streak data"
              message={overview.error.message}
              onRetry={() => overview.refetch()}
            />
          ) : overviewData ? (
            <ConsistencyCard
              score={overviewData.completionPercentage}
              currentStreak={Math.max(1, Math.floor(overviewData.lessonsCompleted / 3))}
              longestStreak={Math.max(1, Math.floor(overviewData.lessonsCompleted / 2))}
            />
          ) : (
            <EmptyState title="No streak data" message="Start a streak by completing daily lessons." />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Time</Text>
          {overview.isLoading ? (
            <Skeleton variant="card" />
          ) : overview.error ? (
            <ErrorState
              title="Could not load learning time"
              message={overview.error.message}
              onRetry={() => overview.refetch()}
            />
          ) : overviewData ? (
            <LearningTimeCard
              dailyMinutes={Math.round(overviewData.totalLearningMinutes / 30)}
              weeklyMinutes={Math.round(overviewData.totalLearningMinutes / 4)}
              monthlyMinutes={overviewData.totalLearningMinutes}
              averageSessionMinutes={Math.round(overviewData.totalLearningMinutes / Math.max(1, overviewData.lessonsCompleted))}
            />
          ) : (
            <EmptyState title="No time data" message="Learning time will appear after completing lessons." />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          {rewards.isLoading ? (
            <Skeleton variant="card" />
          ) : rewards.error ? (
            <ErrorState
              title="Could not load achievements"
              message={rewards.error.message}
              onRetry={() => rewards.refetch()}
            />
          ) : rewardsData && (rewardsData.badges.items.length > 0 || rewardsData.stickers.items.length > 0) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementScroll}>
              {rewardsData.badges.items.map((badge) => (
                <View key={`badge-${badge.id}`} style={styles.achievementChip} accessibilityLabel={`Badge: ${badge.name}`}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                  <Text style={styles.achievementLabel}>{badge.name}</Text>
                </View>
              ))}
              {rewardsData.stickers.items.map((sticker) => (
                <View key={`sticker-${sticker.id}`} style={styles.achievementChip} accessibilityLabel={`Sticker: ${sticker.name}`}>
                  <Ionicons name="star" size={20} color={colors.secondary} />
                  <Text style={styles.achievementLabel}>{sticker.name}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <EmptyState title="No achievements yet" message="Earn badges and stickers by completing lessons." />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickGrid}>
            {QUICK_LINKS.map((link) => (
              <TouchableOpacity
                key={link.key}
                style={styles.quickItem}
                onPress={() => navigation.navigate(link.screen)}
                accessibilityRole="button"
                accessibilityLabel={link.label}
              >
                <View style={styles.quickIconWrap}>
                  <Ionicons name={link.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.quickLabel}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
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
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  childDetail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  chartContainer: {
    marginTop: spacing.md,
  },
  achievementScroll: {
    flexDirection: 'row',
  },
  achievementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  achievementLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickItem: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    textAlign: 'center',
    fontWeight: typography.weights.bold,
  },

});
