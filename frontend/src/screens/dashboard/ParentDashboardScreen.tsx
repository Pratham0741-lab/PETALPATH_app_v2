import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { useAppStore } from '../../store/appStore';
import { useChildStore } from '../../store/childStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import {
  useDashboardOverview,
  useProgressOverview,
  useRecommendation,
  useRewardsOverview,
} from '../../hooks/useLearningQueries';
import { useChildSwitch } from '../../hooks/useChildSwitch';
import { colors, spacing, typography, radius, shadows, breakpoints } from '../../theme';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { toUserMessage } from '../../api/errors';
import {
  DashboardHeader,
  StatsRow,
  DailyProgress,
  ContinueLearning,
  RecommendationCard,
  ChildSwitcher,
  ProgressWidgets,
} from '../../components/dashboard';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

interface QuickAction {
  key: string;
  label: string;
  icon: IconName;
  route?: string;
  disabled?: boolean;
}

export const ParentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();

  const user = useAppStore((state) => state.user);
  const activeChild = useChildStore((state) => state.activeChild);
  const childrenList = useChildStore((state) => state.childrenList);
  const refreshChildren = useChildStore((state) => state.refreshChildren);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isRefetching: dashboardRefetching,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardOverview();

  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress,
  } = useProgressOverview();

  const {
    data: recommendationData,
    isLoading: recommendationLoading,
    error: recommendationError,
    refetch: refetchRecommendation,
  } = useRecommendation();

  const {
    data: rewardsData,
    isLoading: rewardsLoading,
    refetch: refetchRewards,
  } = useRewardsOverview();

  const { switchChild } = useChildSwitch();

  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshChildren(),
      refetchDashboard(),
      refetchProgress(),
      refetchRecommendation(),
      refetchRewards(),
    ]);
  }, [refreshChildren, refetchDashboard, refetchProgress, refetchRecommendation, refetchRewards]);

  useFocusEffect(
    React.useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const parentName = user?.name || user?.email?.split('@')[0] || 'Parent';
  const isInitialLoading = dashboardLoading && !activeChild;

  const dashboardOverview: any = (dashboardData as any)?.data ?? {};
  const progressOverview: any = (progressData as any)?.data ?? {};
  const recommendation: any = (recommendationData as any)?.data ?? null;
  const rewardsOverview: any = (rewardsData as any)?.data ?? {};

  const quickActions: QuickAction[] = [
    { key: 'continue', label: 'Continue Learning', icon: 'play-circle', route: 'Journey' },
    { key: 'roadmap', label: 'Roadmap', icon: 'map', route: 'Journey' },
    { key: 'assessments', label: 'Assessments', icon: 'clipboard', route: 'AssessmentCenter' },
    { key: 'recommendations', label: 'Recommendations', icon: 'bulb', route: 'Recommendations' },
    { key: 'progress', label: 'Progress', icon: 'bar-chart', route: 'Progress' },
    { key: 'children', label: 'Children', icon: 'people', route: 'ChildSelection' },
  ];

  const handleQuickAction = (action: QuickAction) => {
    if (action.disabled || !action.route) return;
    navigation.navigate(action.route);
  };

  const handleSwitchChild = async (childId: string) => {
    await switchChild(childId);
  };

  const handleResumeLearning = () => {
    navigation.navigate('Journey');
  };

  const handleStartRecommendation = () => {
    navigation.navigate('Recommendations');
  };

  if (isInitialLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <LoadingSpinner message="Loading your dashboard…" />
        </View>
      </ScreenContainer>
    );
  }

  if (!activeChild) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <EmptyState
            icon="👶"
            title="Add your first child"
            message="Create a child profile to start tracking their learning journey."
          />
        </View>
      </ScreenContainer>
    );
  }

  if (dashboardError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load dashboard"
            message={toUserMessage(dashboardError)}
            onRetry={refreshAll}
          />
        </View>
      </ScreenContainer>
    );
  }

  const columns = deviceType === 'mobile' ? 2 : 3;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <ChildSwitcher
          children={childrenList}
          activeChildId={activeChild.id}
          onSwitch={handleSwitchChild}
        />

        <DashboardHeader
          greeting={getGreeting()}
          parentName={parentName}
          childName={activeChild.name}
          childAvatar={activeChild.avatar}
          onChildSwitch={() => navigation.navigate('ChildSelection')}
        />

        <StatsRow
          streak={dashboardOverview.streak}
          xp={dashboardOverview.xp}
          coins={dashboardOverview.coins}
          hearts={dashboardOverview.hearts}
          level={dashboardOverview.level}
          loading={dashboardLoading}
        />

        <DailyProgress
          todayCompleted={dashboardOverview.todayCompleted}
          dailyGoal={dashboardOverview.dailyGoal}
          completionPercentage={dashboardOverview.completionPercentage}
          minutesLearned={dashboardOverview.minutesLearned}
          loading={dashboardLoading}
        />

        <ContinueLearning
          lessonTitle={dashboardOverview.continueLearning?.lesson?.title}
          moduleTitle={dashboardOverview.continueLearning?.module?.title}
          categoryTitle={dashboardOverview.continueLearning?.category?.title}
          progress={dashboardOverview.continueLearning?.progress}
          onResume={handleResumeLearning}
          loading={dashboardLoading}
        />

        <RecommendationCard
          recommendation={recommendation}
          loading={recommendationLoading}
          onAction={handleStartRecommendation}
        />

        <Text style={styles.sectionTitle}>Learning Progress</Text>
        <ProgressWidgets
          overallProgress={dashboardOverview.completionPercentage}
          curriculumCompletion={progressOverview.curriculumCompletion}
          currentMastery={progressOverview.currentMastery}
          xp={rewardsOverview.xp ?? dashboardOverview.xp}
          streak={dashboardOverview.streak}
          badgesCount={rewardsOverview.badgesCount}
          skillsMastered={progressOverview.skillsMastered}
          loading={dashboardLoading || progressLoading || rewardsLoading}
        />

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.quickItem,
                { width: columns === 2 ? '47%' : '31%' },
                action.disabled && styles.quickItemDisabled,
              ]}
              onPress={() => handleQuickAction(action)}
              disabled={action.disabled}
              accessibilityLabel={action.label}
              accessibilityRole="button"
            >
              <View style={styles.quickIconWrap}>
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={action.disabled ? colors.textMuted : colors.primary}
                />
              </View>
              <Text style={[styles.quickLabel, action.disabled && styles.quickLabelDisabled]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {dashboardOverview.recentAchievements && (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {renderRecentActivity(dashboardOverview.recentAchievements)}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

function renderRecentActivity(recentAchievements: {
  badges?: Array<{ id: string; name: string; earned?: boolean }>;
  stickers?: Array<{ id: string; name: string; unlocked?: boolean }>;
} | null) {
  const items = [
    ...(recentAchievements?.badges ?? [])
      .filter((b) => b.earned)
      .map((b) => ({ id: `badge-${b.id}`, title: b.name, kind: 'Badge' as const })),
    ...(recentAchievements?.stickers ?? [])
      .filter((s) => s.unlocked)
      .map((s) => ({ id: `sticker-${s.id}`, title: s.name, kind: 'Sticker' as const })),
  ].slice(0, 5);

  if (items.length === 0) {
    return (
      <View style={styles.activityCard}>
        <Text style={styles.noActivity}>
          No recent activity yet. Start a lesson to earn badges and stickers!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityList}>
        {items.map((item) => (
          <View key={item.id} style={styles.activityItem}>
            <Text style={styles.activityIcon}>
              {item.kind === 'Badge' ? '🏅' : '🔖'}
            </Text>
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityKind}>{item.kind} earned</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickItemDisabled: {
    opacity: 0.5,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    textAlign: 'center',
    fontWeight: typography.weights.bold,
  },
  quickLabelDisabled: {
    color: colors.textMuted,
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  activityList: {
    gap: spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activityKind: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  noActivity: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});

export default ParentDashboardScreen;
