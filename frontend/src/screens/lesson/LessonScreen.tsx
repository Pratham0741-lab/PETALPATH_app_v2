import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { ActivityNode } from '../../components/roadmap/ActivityNode';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLesson, useActivities, useCompleteLesson } from '../../hooks/useLearningQueries';
import { toUserMessage } from '../../api/errors';
import { useDeviceType } from '../../hooks/useDeviceType';
import type { ApiResponse } from '../../types/api';
import type { Lesson, Activity } from '../../store/roadmapStore';
import { colors, spacing, typography, radius, iconSizes, breakpoints } from '../../theme';

type LessonRouteParams = {
  LessonOverview: { lessonId: string };
};

type ExtendedActivityType = 'video' | 'listen' | 'speak' | 'write' | 'reading' | 'quiz' | 'story' | 'game' | 'ai_tutor';

const launchActivity = (activity: { id: string; activityType: ExtendedActivityType }, navigation: any) => {
  switch (activity.activityType) {
    case 'video':
      navigation.navigate('Video', { activityId: activity.id });
      break;
    case 'listen':
      navigation.navigate('Listen', { activityId: activity.id });
      break;
    case 'speak':
      navigation.navigate('Speak', { activityId: activity.id });
      break;
    case 'write':
      navigation.navigate('Write', { activityId: activity.id });
      break;
    case 'reading':
      navigation.navigate('Reading', { activityId: activity.id });
      break;
    case 'story':
      navigation.navigate('Stories', { activityId: activity.id });
      break;
    case 'quiz':
      navigation.navigate('Quiz', { activityId: activity.id });
      break;
    case 'game':
      navigation.navigate('Game', { activityId: activity.id });
      break;
    case 'ai_tutor':
      navigation.navigate('AITutor', { activityId: activity.id });
      break;
  }
};

export const LessonScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LessonRouteParams, 'LessonOverview'>>();
  const { lessonId } = route.params;
  const deviceType = useDeviceType();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = deviceType === 'desktop' || windowWidth >= breakpoints.tabletMax;

  const {
    data: lessonRaw,
    isLoading: lessonLoading,
    isError: lessonError,
    error: lessonErrorObj,
    refetch: refetchLesson,
    isFetching: lessonFetching,
  } = useLesson(lessonId);

  const {
    data: activitiesRaw,
    isLoading: activitiesLoading,
    isError: activitiesError,
    error: activitiesErrorObj,
    refetch: refetchActivities,
    isFetching: activitiesFetching,
  } = useActivities(lessonId);

  const completeLessonMutation = useCompleteLesson();

  const lesson = (lessonRaw as ApiResponse<Lesson> | undefined)?.data ?? null;
  const activities = (activitiesRaw as ApiResponse<Activity[]> | undefined)?.data ?? [];

  const isRefreshing = lessonFetching || activitiesFetching;

  const handleRefresh = useCallback(() => {
    refetchLesson();
    refetchActivities();
  }, [refetchLesson, refetchActivities]);

  const handleActivityPress = useCallback(
    (activity: Activity) => {
      launchActivity(activity as { id: string; activityType: ExtendedActivityType }, navigation);
    },
    [navigation],
  );

  const isAllActivitiesCompleted = activities.length > 0 && activities.every((a) => {
    if (!lesson?.progress) return false;
    const p = lesson.progress;
    if (a.activityType === 'video') return p.videoCompleted;
    if (a.activityType === 'listen') return p.listenCompleted;
    if (a.activityType === 'speak') return p.speakCompleted;
    if (a.activityType === 'write') return p.writeCompleted;
    return false;
  });

  const handleCompleteLesson = useCallback(() => {
    if (lessonId) {
      completeLessonMutation.mutate(lessonId);
    }
  }, [lessonId, completeLessonMutation]);

  const isLoading = lessonLoading || activitiesLoading;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonBackRow}>
              <Skeleton variant="circle" width={32} height={32} />
            </View>
            <Skeleton variant="rect" width="70%" height={28} style={styles.skelMargin} />
            <Skeleton variant="text" width="100%" height={14} style={styles.skelMargin} />
            <View style={styles.skeletonStats}>
              <Skeleton variant="rect" width={80} height={40} borderRadius={12} />
              <Skeleton variant="rect" width={80} height={40} borderRadius={12} />
              <Skeleton variant="rect" width={80} height={40} borderRadius={12} />
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (lessonError || activitiesError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load lesson"
            message={toUserMessage(lessonErrorObj ?? activitiesErrorObj)}
            onRetry={handleRefresh}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!lesson) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <EmptyState
            icon="🔍"
            title="Lesson not found"
            message="This lesson doesn't exist or has been removed."
          />
        </View>
      </ScreenContainer>
    );
  }

  const completedActivityCount = activities.filter(
    (a) => {
      if (!lesson.progress) return false;
      const p = lesson.progress;
      if (a.activityType === 'video') return p.videoCompleted;
      if (a.activityType === 'listen') return p.listenCompleted;
      if (a.activityType === 'speak') return p.speakCompleted;
      if (a.activityType === 'write') return p.writeCompleted;
      return false;
    },
  ).length;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.purple}
          />
        }
      >
        <View style={[styles.contentInner, isDesktop && styles.contentInnerDesktop]}>
          <View style={styles.titleSection}>
            <View style={styles.backRow}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Ionicons name="arrow-back" size={18} color={colors.textPrimary} />}
                label="Back"
                onPress={() => navigation.goBack()}
              />
            </View>

            <Text style={styles.difficultyBadge}>
              <Chip
                label={lesson.difficulty}
                size="sm"
                variant={
                  lesson.difficulty === 'EASY' ? 'success' :
                  lesson.difficulty === 'MEDIUM' ? 'warning' : 'error'
                }
              />
            </Text>

            <Text style={styles.title}>{lesson.title}</Text>

            {lesson.description ? (
              <Text style={styles.description}>{lesson.description}</Text>
            ) : null}
          </View>

          <View style={styles.statsGrid}>
            {lesson.progress ? (
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={iconSizes.sm} color={colors.green} />
                <Text style={styles.statValue}>{completedActivityCount}/{activities.length}</Text>
                <Text style={styles.statLabel}>Activities</Text>
              </View>
            ) : null}
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={iconSizes.sm} color={colors.primary} />
              <Text style={styles.statValue}>
                {lesson.activities?.[0]?.video?.duration
                  ? `${Math.ceil(lesson.activities[0].video.duration / 60)}m`
                  : '~5m'}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={iconSizes.sm} color={colors.yellow} />
              <Text style={styles.statValue}>10</Text>
              <Text style={styles.statLabel}>XP Reward</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={iconSizes.sm} color={colors.text} />
            <Text style={styles.sectionTitle}>Activities</Text>
          </View>

          {activities.length === 0 ? (
            <View style={styles.emptyActivities}>
              <EmptyState
                icon="🎯"
                title="No activities yet"
                message="Activities will appear here when they're ready."
              />
            </View>
          ) : (
            <View style={styles.activityList}>
              {activities.map((activity) => (
                <ActivityNode
                  key={activity.id}
                  id={activity.id}
                  title={activity.title}
                  activityType={activity.activityType}
                  isCompleted={false}
                  onPress={() => handleActivityPress(activity)}
                />
              ))}
            </View>
          )}

          <View style={styles.completeSection}>
            <Button
              label={
                lesson.isCompleted
                  ? 'Lesson Completed ✓'
                  : 'Complete Lesson'
              }
              variant={lesson.isCompleted ? 'success' : 'primary'}
              onPress={handleCompleteLesson}
              loading={completeLessonMutation.isPending}
              disabled={lesson.isCompleted}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  scrollContentDesktop: {
    alignItems: 'center',
  },
  contentInner: {
    padding: spacing.lg,
  },
  contentInnerDesktop: {
    maxWidth: 720,
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  skeletonHeader: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  skeletonBackRow: {
    marginBottom: spacing.md,
  },
  skelMargin: {
    marginBottom: spacing.sm,
  },
  skeletonStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  difficultyBadge: {
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    lineHeight: typography.lineHeights.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  statLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  activityList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyActivities: {
    marginBottom: spacing.xl,
  },
  completeSection: {
    marginTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
