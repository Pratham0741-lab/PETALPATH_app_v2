import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, useWindowDimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { MasteryProgress, SkillGraph } from '../../components/mastery';
import { WeakSkillCard } from '../../components/recommendations/WeakSkillCard';
import { useMasteryDetail, useWeakSkills } from '../../hooks/useIntelligence';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import type { MasteryData, WeakSkill } from '../../services/api/intelligenceApi';

function StatsSkeleton() {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.statItem}>
          <Skeleton width={36} height={24} />
          <Skeleton width={60} height={12} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
}

function AnimatedEntry({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function RecentlyMasteredCard({ skill, index }: { skill: MasteryData; index: number }) {
  const { theme: { colors: themeColors } } = useTheme();

  return (
    <AnimatedEntry delay={index * 80}>
      <View style={[styles.masteredCard, { backgroundColor: themeColors.card, borderColor: `${themeColors.success}30` }]}>
        <View style={styles.masteredCardLeft}>
          <View style={[styles.masteredIconWrap, { backgroundColor: `${themeColors.success}18` }]}>
            <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
          </View>
          <View style={styles.masteredCardInfo}>
            <Text style={[styles.masteredSkillName, { color: themeColors.text }]} numberOfLines={1}>
              {skill.skillName}
            </Text>
            <Text style={[styles.masteredDomain, { color: themeColors.textMuted }]} numberOfLines={1}>
              {skill.domain}
            </Text>
          </View>
        </View>
        <Text style={[styles.masteredScore, { color: themeColors.success }]}>
          {Math.round(skill.masteryScore)}%
        </Text>
      </View>
    </AnimatedEntry>
  );
}

export function MasteryScreen() {
  const { theme: { colors: themeColors } } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { navigateTo } = useAppNavigation();

  const {
    data: masteryData,
    isLoading: masteryLoading,
    isError: masteryError,
    error: masteryErr,
    refetch: refetchMastery,
    isFetching: masteryFetching,
  } = useMasteryDetail();

  const {
    data: weakSkillsData,
    isLoading: weakLoading,
    isError: weakError,
    refetch: refetchWeak,
  } = useWeakSkills();

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchMastery(), refetchWeak()]);
  }, [refetchMastery, refetchWeak]);

  const isLoading = masteryLoading || weakLoading;
  const isError = masteryError || weakError;
  const isFetching = masteryFetching;

  const skills = masteryData?.data as MasteryData[] | undefined ?? [];
  const weakSkills = weakSkillsData?.data as WeakSkill[] | undefined ?? [];

  const averageMastery = useMemo(() => {
    if (skills.length === 0) return 0;
    const total = skills.reduce((sum, s) => sum + s.masteryScore, 0);
    return total / skills.length;
  }, [skills]);

  const stats = useMemo(() => {
    const total = skills.length;
    const mastered = skills.filter((s) => s.masteryState === 'mastered').length;
    const inProgress = skills.filter((s) => s.masteryState === 'in_progress').length;
    const locked = skills.filter((s) => s.masteryState === 'locked').length;
    return { total, mastered, inProgress, locked };
  }, [skills]);

  const recentlyMastered = useMemo(() => {
    return skills.filter((s) => s.masteryState === 'mastered');
  }, [skills]);

  const handlePractice = useCallback((skillId: string) => {
    navigateTo('AITutor', { activityId: skillId });
  }, [navigateTo]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
          accessibilityLabel="Loading mastery screen"
        >
          <View style={styles.header}>
            <Skeleton variant="circle" width={36} height={36} />
            <Skeleton width={140} height={24} style={{ marginLeft: spacing.sm }} />
          </View>
          <View style={styles.overallSection}>
            <Skeleton variant="circle" width={120} height={120} />
            <Skeleton width={80} height={16} style={{ marginTop: spacing.md }} />
          </View>
          <StatsSkeleton />
          <Card>
            <Skeleton width={120} height={18} />
            <View style={{ marginTop: spacing.md }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="card" height={80} style={{ marginTop: spacing.sm }} />
              ))}
            </View>
          </Card>
          <Skeleton variant="card" height={200} style={{ marginTop: spacing.md }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <ErrorState
            title="Couldn't load mastery data"
            message={(masteryErr as any)?.message ?? 'An error occurred loading mastery data.'}
            onRetry={onRefresh}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (skills.length === 0) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={themeColors.primary} colors={[themeColors.primary]} />
          }
        >
          <View style={styles.header}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.warning}18` }]}>
              <Ionicons name="trophy-outline" size={24} color={themeColors.warning} />
            </View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Skill Mastery</Text>
          </View>
          <EmptyState
            icon="🏆"
            title="No skills tracked yet"
            message="Start learning activities to build your mastery data."
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        accessibilityLabel="Skill Mastery Screen"
      >
        <View style={styles.header}>
          <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.warning}18` }]}>
            <Ionicons name="trophy-outline" size={24} color={themeColors.warning} />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Skill Mastery</Text>
        </View>

        <View style={styles.overallSection}>
          <MasteryProgress score={averageMastery} label="Overall Mastery" size={Math.min(windowWidth * 0.3, 140)} />
        </View>

        <View style={styles.statsRow} accessibilityLabel="Mastery statistics" accessibilityRole="summary">
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.success }]}>{stats.mastered}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Mastered</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.blue }]}>{stats.inProgress}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>In Progress</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.textMuted }]}>{stats.locked}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Locked</Text>
          </View>
        </View>

        {weakSkills.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Weak Skills</Text>
            {weakSkills.slice(0, 5).map((skill, index) => (
              <WeakSkillCard
                key={skill.skillId}
                skillName={skill.skillName}
                domain={skill.domain}
                masteryScore={skill.masteryScore}
                gap={skill.gap}
                priority={skill.priority}
                onPractice={() => handlePractice(skill.skillId)}
              />
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>All Skills</Text>
        <Card padding="none" variant="flat">
          <SkillGraph
            skills={skills}
            onSkillPress={(skillId) => navigateTo('AITutor', { activityId: skillId })}
          />
        </Card>

        {recentlyMastered.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recently Mastered</Text>
            <View accessibilityLabel="Recently mastered skills" accessibilityRole="list">
              {recentlyMastered.slice(0, 5).map((skill, index) => (
                <RecentlyMasteredCard key={skill.skillId} skill={skill} index={index} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.md,
  },
  overallSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  masteredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  masteredCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  masteredIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  masteredCardInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  masteredSkillName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  masteredDomain: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  masteredScore: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
});
