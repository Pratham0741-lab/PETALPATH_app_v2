import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useChildStore } from '../../store/childStore';
import {
  useAnalyticsOverview,
  useAnalyticsActivity,
  useCurriculumInsights,
  useAnalyticsRewards,
} from '../../hooks/useParentAnalytics';
import {
  AppShell,
  AvatarGlyph,
  Card,
  IconWell,
  PageHeader,
  ParentRow,
  ParentSection,
  PetalIcon,
  SegmentedTabs,
} from '../../components/design';
import type { PetalIconName, SegmentedTabItem } from '../../components/design';
import {
  ActivityBucketsCard,
  ConsistencyCard,
  CurriculumProgressCard,
  DataSection,
  LearningTimeCard,
  MonthlyLearningCard,
  ProgressSummaryCard,
  WeeklyLearningCard,
} from '../../components/analytics';
import { colors, spacing, typography, cardSizes, breakpoints, layoutSizes } from '../../theme';
import type {
  OverviewMetrics,
  ActivitySeries,
  CurriculumInsight,
  RewardsSummary,
} from '../../services/api/analyticsApi';

/**
 * Parent Dashboard (spec §26).
 *
 * The grown-up entrance to everything the app knows about a child's learning.
 * Same tokens and surfaces as the child-facing screens, but calmer: no
 * illustrations, data before decoration, a light petal layer rather than the
 * normal one.
 *
 * Every hook, derived figure and destination is unchanged from the version this
 * replaces — what changed is that the screen now composes `AppShell`,
 * `PageHeader`, `DataSection` and the shared analytics cards instead of a
 * `ScreenContainer`, seven Ionicons and its own tab strip (§28).
 */

type PeriodTab = 'daily' | 'weekly' | 'monthly';

const PERIOD_ITEMS: SegmentedTabItem<PeriodTab>[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

interface QuickLink {
  key: string;
  label: string;
  icon: PetalIconName;
  screen: string;
  /** Read out after the label, so the tile says what it opens. */
  hint: string;
}

const QUICK_LINKS: QuickLink[] = [
  { key: 'analytics', label: 'Analytics', icon: 'chart', screen: 'Analytics', hint: 'Charts and trends over time' },
  { key: 'skillMastery', label: 'Skill Mastery', icon: 'medal', screen: 'SkillMastery', hint: 'Progress on each skill' },
  /*
   * The practice queue had no way in. It has been registered in the navigator
   * all along, but nothing navigated to it, so the one screen that explains why
   * the app keeps re-offering lessons was unreachable. It sits next to Skill
   * Mastery deliberately: that tile says where each skill stands, this one says
   * what the engine is doing about it.
   */
  { key: 'practice', label: 'Practice Queue', icon: 'replay', screen: 'ReinforcementQueue', hint: 'What needs another go, and why' },
  { key: 'learningHistory', label: 'Learning History', icon: 'clock', screen: 'LearningHistory', hint: 'Everything completed, newest first' },
  { key: 'weeklyReport', label: 'Weekly Report', icon: 'calendar', screen: 'WeeklyReport', hint: 'This week at a glance' },
  { key: 'monthlyReport', label: 'Monthly Report', icon: 'calendar', screen: 'MonthlyReport', hint: 'This month at a glance' },
  { key: 'curriculum', label: 'Curriculum Insights', icon: 'book', screen: 'CurriculumInsights', hint: 'Where your child is in the curriculum' },
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
  const buckets = currentActivity?.buckets ?? [];

  const hasAchievements =
    !!rewardsData && (rewardsData.badges.items.length > 0 || rewardsData.stickers.items.length > 0);

  return (
    <AppShell
      petals="light"
      header={<PageHeader title="Parent Dashboard" subtitle="Progress, time and rewards" centered={false} />}
      contentContainerStyle={isTabletOrDesktop ? styles.contentTablet : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <DataSection
        title="Child Overview"
        icon="profile"
        boxed
        empty={!activeChild}
        emptyTitle="No child selected"
        emptyMessage="Select a child to view their dashboard."
        emptyIcon="profile"
      >
        {activeChild ? (
          <View>
            <View style={styles.childRow}>
              <AvatarGlyph
                species={activeChild.avatar}
                size={56}
                ringColor={colors.primary}
                accessibilityLabel={`${activeChild.name}'s avatar`}
              />
              <View style={styles.childInfo}>
                <Text style={typography.presets.cardTitle}>{activeChild.name}</Text>
                <Text style={[typography.presets.caption, styles.muted]}>
                  Age {activeChild.age}
                  {activeChild.ageGroup ? ` · ${activeChild.ageGroup}` : ''}
                </Text>
              </View>
            </View>
            {activeChild.mentor ? (
              <ParentRow
                label="Mentor"
                value={activeChild.mentor.name}
                icon="mentors"
                iconColor={colors.secondary}
                divided
                style={styles.mentorRow}
              />
            ) : null}
          </View>
        ) : null}
      </DataSection>

      <DataSection
        title="Overall Completion"
        icon="chart"
        loading={overview.isLoading}
        error={overview.error}
        errorTitle="Could not load completion data"
        onRetry={() => overview.refetch()}
        empty={!overviewData}
        emptyTitle="No data yet"
        emptyMessage="Complete lessons to see progress."
        emptyIcon="chart"
      >
        <ProgressSummaryCard
          loading={overview.isLoading}
          completionPercentage={overviewData?.completionPercentage ?? 0}
          lessonsCompleted={overviewData?.lessonsCompleted ?? 0}
        />
      </DataSection>

      <DataSection
        title="Current Curriculum"
        icon="book"
        loading={curriculum.isLoading}
        error={curriculum.error}
        errorTitle="Could not load curriculum"
        onRetry={() => curriculum.refetch()}
        empty={!curriculumData}
        emptyTitle="No curriculum data"
        emptyMessage="Curriculum insights will appear here."
        emptyIcon="book"
      >
        <CurriculumProgressCard
          loading={curriculum.isLoading}
          modulesCompleted={curriculumData?.modulesCompleted ?? 0}
          modulesTotal={(curriculumData?.modulesCompleted ?? 0) + (curriculumData?.modulesRemaining ?? 0)}
          lessonsCompleted={curriculumData?.lessonsCompleted ?? 0}
          lessonsTotal={(curriculumData?.lessonsCompleted ?? 0) + (curriculumData?.lessonsRemaining ?? 0)}
        />
      </DataSection>

      <DataSection
        title="Progress"
        icon="chart"
        loading={currentActivityLoading}
        error={currentActivityError}
        errorTitle="Could not load activity"
        onRetry={currentActivityRefetch}
        empty={buckets.length === 0}
        emptyTitle="No activity data"
        emptyMessage="Activity data will appear once lessons are completed."
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
        {/* One card per period rather than a card *and* a loose duplicate chart
            below it, which is what the previous version drew. */}
        {selectedPeriod === 'weekly' ? (
          <WeeklyLearningCard buckets={buckets} loading={currentActivityLoading} />
        ) : selectedPeriod === 'monthly' ? (
          <MonthlyLearningCard buckets={buckets} loading={currentActivityLoading} />
        ) : (
          <ActivityBucketsCard
            title="Day by Day"
            icon="calendar"
            buckets={buckets}
            totalNoun="activities"
            loading={currentActivityLoading}
          />
        )}
      </DataSection>

      <DataSection
        title="Learning Streak"
        icon="flame"
        loading={overview.isLoading}
        error={overview.error}
        errorTitle="Could not load streak data"
        onRetry={() => overview.refetch()}
        empty={!overviewData}
        emptyTitle="No streak data"
        emptyMessage="Start a streak by completing daily lessons."
        emptyIcon="flame"
      >
        <ConsistencyCard
          loading={overview.isLoading}
          score={overviewData?.completionPercentage ?? 0}
          currentStreak={Math.max(1, Math.floor((overviewData?.lessonsCompleted ?? 0) / 3))}
          longestStreak={Math.max(1, Math.floor((overviewData?.lessonsCompleted ?? 0) / 2))}
        />
      </DataSection>

      <DataSection
        title="Learning Time"
        icon="clock"
        loading={overview.isLoading}
        error={overview.error}
        errorTitle="Could not load learning time"
        onRetry={() => overview.refetch()}
        empty={!overviewData}
        emptyTitle="No time data"
        emptyMessage="Learning time will appear after completing lessons."
        emptyIcon="clock"
      >
        <LearningTimeCard
          loading={overview.isLoading}
          dailyMinutes={Math.round((overviewData?.totalLearningMinutes ?? 0) / 30)}
          weeklyMinutes={Math.round((overviewData?.totalLearningMinutes ?? 0) / 4)}
          monthlyMinutes={overviewData?.totalLearningMinutes ?? 0}
          averageSessionMinutes={Math.round(
            (overviewData?.totalLearningMinutes ?? 0) / Math.max(1, overviewData?.lessonsCompleted ?? 0),
          )}
        />
      </DataSection>

      <DataSection
        title="Recent Achievements"
        icon="trophy"
        loading={rewards.isLoading}
        error={rewards.error}
        errorTitle="Could not load achievements"
        onRetry={() => rewards.refetch()}
        empty={!hasAchievements}
        emptyTitle="No achievements yet"
        emptyMessage="Earn badges and stickers by completing lessons."
        emptyIcon="trophy"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {rewardsData?.badges.items.map((badge) => (
            <AchievementChip key={`badge-${badge.id}`} kind="Badge" name={badge.name} icon="medal" color={colors.accent} />
          ))}
          {rewardsData?.stickers.items.map((sticker) => (
            <AchievementChip key={`sticker-${sticker.id}`} kind="Sticker" name={sticker.name} icon="star" color={colors.secondary} />
          ))}
        </ScrollView>
      </DataSection>

      <ParentSection title="Quick Links" icon="parent" boxed={false}>
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map((link) => (
            // The tile carries the flex sizing rather than the Card, because an
            // interactive Card puts its own animated wrapper between the two.
            <View key={link.key} style={styles.quickTile}>
              <Card
                onPress={() => navigation.navigate(link.screen)}
                accessibilityLabel={link.label}
                accessibilityHint={link.hint}
                contentStyle={styles.quickInner}
                style={styles.quickCard}
              >
                <IconWell
                  icon={link.icon}
                  color={colors.primary}
                  soft={colors.primaryLight}
                  size={cardSizes.iconWellSmall}
                />
                <Text style={[typography.presets.cardTitle, styles.quickLabel]} numberOfLines={2}>
                  {link.label}
                </Text>
              </Card>
            </View>
          ))}
        </View>
      </ParentSection>
    </AppShell>
  );
};

/**
 * One earned badge or sticker. The kind is spoken as well as drawn, so a badge
 * and a sticker are not told apart by icon colour alone (§30).
 */
const AchievementChip: React.FC<{
  kind: string;
  name: string;
  icon: PetalIconName;
  color: string;
}> = ({ kind, name, icon, color }) => (
  <Card variant="flat" padding="compact">
    <View style={styles.chipInner} accessible accessibilityLabel={`${kind}: ${name}`}>
      <PetalIcon name={icon} size={18} color={color} />
      <Text style={[typography.presets.caption, styles.chipLabel]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  </Card>
);

const styles = StyleSheet.create({
  contentTablet: {
    maxWidth: layoutSizes.report,
    alignSelf: 'center',
    width: '100%',
  },
  muted: {
    color: colors.textSecondary,
  },

  // ------------------------------------------------------------ child overview
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  childInfo: {
    flex: 1,
    minWidth: 0,
  },
  mentorRow: {
    marginTop: spacing.sm,
  },

  // ------------------------------------------------------------- achievements
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipLabel: {
    color: colors.text,
    fontWeight: '700',
    maxWidth: 180,
  },

  // -------------------------------------------------------------- quick links
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: cardSizes.gap,
  },
  quickTile: {
    // Two per row at 360px, three from ~600px up — no hardcoded widths (§27).
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
  },
  quickCard: {
    height: '100%',
  },
  quickInner: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickLabel: {
    color: colors.text,
    textAlign: 'center',
  },
});

export default ParentDashboardScreen;
