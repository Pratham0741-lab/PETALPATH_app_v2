import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { useAppStore } from '../../store/appStore';
import { useChildStore } from '../../store/childStore';
import { useProgressStore } from '../../store/progressStore';
import { useRewardsStore } from '../../store/rewardsStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarEmoji, getAvatarBgColor } from '../profile/ChildSelectionScreen';
import { toUserMessage } from '../../api/errors';

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

interface StatCardProps {
  label: string;
  value: string;
  icon: IconName;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <AppCard style={styles.statCard}>
    <View style={styles.statIconWrap}>
      <Ionicons name={icon} size={20} color={colors.purple} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </AppCard>
);

export const ParentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();

  const user = useAppStore((state) => state.user);
  const activeChild = useChildStore((state) => state.activeChild);
  const childrenList = useChildStore((state) => state.childrenList);
  const refreshChildren = useChildStore((state) => state.refreshChildren);

  const {
    completionPercentage,
    completedLessonsCount,
    totalLessonsCount,
    continueLearning,
    recentAchievements,
    loading: progressLoading,
    error: progressError,
    refreshProgress,
  } = useProgressStore();

  const { totalStars, refreshRewards } = useRewardsStore();

  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshChildren(),
      refreshProgress(),
      refreshRewards(),
    ]);
  }, [refreshChildren, refreshProgress, refreshRewards]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
  const isInitialLoading = progressLoading && completedLessonsCount === 0 && !activeChild;

  const quickActions: QuickAction[] = [
    { key: 'continue', label: 'Continue Learning', icon: 'play-circle', route: 'Journey' },
    { key: 'roadmap', label: 'Roadmap', icon: 'map', route: 'Journey' },
    { key: 'assessments', label: 'Assessments', icon: 'clipboard', disabled: true },
    { key: 'recommendations', label: 'Recommendations', icon: 'bulb', route: 'Recommendations' },
    { key: 'progress', label: 'Progress', icon: 'bar-chart', route: 'Progress' },
    { key: 'children', label: 'Children', icon: 'people', route: 'ChildSelection' },
  ];

  const recentItems = [
    ...(recentAchievements?.badges ?? [])
      .filter((b) => b.earned)
      .map((b) => ({ id: `badge-${b.id}`, title: b.name, kind: 'Badge' })),
    ...(recentAchievements?.stickers ?? [])
      .filter((s) => s.unlocked)
      .map((s) => ({ id: `sticker-${s.id}`, title: s.name, kind: 'Sticker' })),
  ].slice(0, 5);

  const handleQuickAction = (action: QuickAction) => {
    if (action.disabled || !action.route) return;
    navigation.navigate(action.route);
  };

  if (isInitialLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <LoadingSpinner label="Loading your dashboard…" />
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
          <View style={styles.emptyCta}>
            <AppButton
              label="Add Child"
              onPress={() => navigation.navigate('ChildSelection')}
              variant="accent"
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (progressError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load dashboard"
            message={toUserMessage(progressError)}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
        }
      >
        {/* Greeting header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}, {parentName} 🌸</Text>
          <Text style={styles.subtitle}>
            Here's how {activeChild.name}'s learning is going.
          </Text>
        </View>

        {/* Active child summary */}
        <AppCard style={styles.childCard}>
          <View style={styles.childRow}>
            <View style={[styles.avatarCircle, { backgroundColor: getAvatarBgColor(activeChild.avatar) }]}>
              <Text style={styles.avatarEmoji}>{getAvatarEmoji(activeChild.avatar)}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{activeChild.name}</Text>
              <Text style={styles.childSub}>
                {activeChild.ageGroup} • Age {activeChild.age}
              </Text>
              <Text style={styles.childSub}>
                {activeChild.mentor ? activeChild.mentor.name : 'No companion yet'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => navigation.navigate('ChildSelection')}
              accessibilityLabel="Switch child profile"
              accessibilityRole="button"
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.purple} />
              <Text style={styles.switchText}>
                {childrenList.length > 1 ? 'Switch' : 'Manage'}
              </Text>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Quick actions */}
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
                  color={action.disabled ? colors.textMuted : colors.purple}
                />
              </View>
              <Text style={[styles.quickLabel, action.disabled && styles.quickLabelDisabled]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress overview */}
        <Text style={styles.sectionTitle}>Progress Overview</Text>
        <View style={styles.statsRow}>
          <StatCard label="Lessons Done" value={`${completedLessonsCount}/${totalLessonsCount}`} icon="school" />
          <StatCard label="Complete" value={`${completionPercentage}%`} icon="pie-chart" />
          <StatCard label="Stars" value={`${totalStars} ⭐`} icon="star" />
        </View>

        {/* Continue learning */}
        {continueLearning ? (
          <AppCard style={styles.continueCard}>
            <View style={styles.continueRow}>
              <View style={styles.continueText}>
                <Text style={styles.continueLabel}>Continue Learning</Text>
                <Text style={styles.continueTitle}>{continueLearning.lesson.title}</Text>
                <Text style={styles.continueSub}>{continueLearning.module.title}</Text>
              </View>
              <AppButton
                label="Resume"
                onPress={() => navigation.navigate('Journey')}
                variant="primary"
                style={styles.resumeBtn}
              />
            </View>
          </AppCard>
        ) : null}

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentItems.length > 0 ? (
          <AppCard>
            <View style={styles.activityList}>
              {recentItems.map((item) => (
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
          </AppCard>
        ) : (
          <AppCard>
            <Text style={styles.noActivity}>
              No recent activity yet. Start a lesson to earn badges and stickers!
            </Text>
          </AppCard>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

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
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  childCard: {
    marginBottom: spacing.lg,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  childSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchText: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginLeft: 4,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  continueCard: {
    marginTop: spacing.sm,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueText: {
    flex: 1,
    marginRight: spacing.md,
  },
  continueLabel: {
    fontSize: typography.sizes.xs,
    color: colors.purple,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  continueTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  continueSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  resumeBtn: {
    minWidth: 110,
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
  emptyCta: {
    marginTop: spacing.lg,
    width: 240,
  },
});

export default ParentDashboardScreen;
