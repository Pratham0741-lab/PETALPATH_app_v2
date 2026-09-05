/**
 * Lesson (route `'Lesson'`) — the react-query flavour of the lesson overview
 * (spec §34 phase 6).
 *
 * This is a *second* lesson-overview screen. `LessonOverviewContent` reads
 * `roadmapStore`; this one reads the react-query layer
 * (`useLesson`/`useActivities`/`useCompleteLesson`) and has its own
 * `launchActivity` switch. Nothing currently navigates to `'Lesson'`, but it is
 * registered in both stacks, so it is restyled rather than deleted — §1 forbids
 * removing functionality to make the redesign easier, and §35 requires every
 * reachable screen to share one design system.
 *
 * Every piece of behaviour is carried across untouched: the two queries, the
 * mutation, `handleRefresh`, `launchActivity`'s five destinations, the
 * `RefreshControl`, and the `normalizeActivityType`-based progress reads.
 *
 * What changed is presentation:
 *  - `ScreenContainer` + a hand-rolled `ScrollView` → `AppShell`, and the ghost
 *    "Back" `Button` → `PageHeader`'s standard back affordance.
 *  - The difficulty `Chip` was wrapped in a `<Text>` — a View inside a Text,
 *    which RN on Android can refuse to lay out. Difficulty is now a stat tile,
 *    which also removes the last `components/ui` import.
 *  - Three hand-rolled stat cards (Ionicons `checkmark-circle` / `time-outline`
 *    / `star`) → the shared `StatGrid`, and the `layers` section glyph → a
 *    `PetalIcon` (§7).
 *  - `EmptyState icon="🔍"` / `"🎯"` and the literal `'Lesson Completed ✓'` →
 *    real icon names and a `check` icon on the footer button (§7).
 *  - The `breakpoints.tabletMax` branch → a plain `maxWidth` cap on the content
 *    column, so the layout follows real available width (§27).
 *
 * Two things the old markup computed but never showed are now visible, using
 * data that was already there rather than anything invented: each activity's
 * completed flag (it passed a hardcoded `isCompleted={false}`) and
 * `isAllActivitiesCompleted`, which was assigned and then unused.
 */

import React, { useCallback, useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useLesson, useActivities, useCompleteLesson } from '../../hooks/useLearningQueries';
import { toUserMessage } from '../../api/errors';
import type { ApiResponse } from '../../types/api';
import type { Lesson, Activity } from '../../store/roadmapStore';
import { colors, spacing, typography } from '../../theme';
import { normalizeActivityType } from '../../utils/activityNormalization';
import { difficultyBand } from '../../utils/difficulty';
import { PetalMark } from '../../components/brand/PetalMark';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import {
  ActivityCard,
  AppShell,
  Card,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  ProgressIndicator,
  Stat,
  StatGrid,
  StatusBadge,
} from '../../components/design';

type LessonRouteParams = {
  LessonOverview: { lessonId: string };
};

/** Caps the reading column on a tablet or desktop window (§27). */
const MAX_CONTENT_WIDTH = 720;

/**
 * The stars a lesson awards. Was a bare `10` in the markup; it is the shipped
 * figure, so it is carried across as a named constant rather than changed.
 */
const LESSON_XP_REWARD = 10;

const launchActivity = (activity: { id: string; activityType: string }, navigation: any) => {
  const normalizedType = normalizeActivityType(activity.activityType);
  switch (normalizedType) {
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
    case 'drag_drop':
      navigation.navigate('Game', {
        activityId: activity.id,
        dragDropSpec: (activity as Activity).dragDropSpec,
        title: (activity as Activity).title,
      });
      break;
  }
};

/**
 * The four progress flags the old `completedActivityCount` filter read, pulled
 * out so the activity cards and the counter cannot drift apart. `drag_drop` has
 * no flag of its own, which is why it reports `false` here — same as before.
 */
const isActivityDone = (
  activity: { activityType: string },
  progress: Lesson['progress'] | undefined,
): boolean => {
  if (!progress) return false;
  const t = normalizeActivityType(activity.activityType);
  if (t === 'video') return !!progress.videoCompleted;
  if (t === 'listen') return !!progress.listenCompleted;
  if (t === 'speak') return !!progress.speakCompleted;
  if (t === 'write') return !!progress.writeCompleted;
  return false;
};

export const LessonScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LessonRouteParams, 'LessonOverview'>>();
  const { lessonId } = route.params;

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
      launchActivity(activity as any, navigation);
    },
    [navigation],
  );

  const handleCompleteLesson = useCallback(() => {
    if (lessonId) {
      completeLessonMutation.mutate(lessonId);
    }
  }, [lessonId, completeLessonMutation]);

  const completedActivityCount = activities.filter((a) => isActivityDone(a, lesson?.progress))
    .length;
  const allActivitiesCompleted =
    activities.length > 0 && completedActivityCount === activities.length;
  const percent =
    activities.length > 0 ? Math.round((completedActivityCount / activities.length) * 100) : 0;

  const durationLabel = lesson?.activities?.[0]?.video?.duration
    ? `${Math.ceil(lesson.activities[0].video.duration / 60)}m`
    : '~5m';

  const stats = useMemo<Stat[]>(() => {
    const tiles: Stat[] = [];

    /* Only shown when there is progress to report — same condition as before. */
    if (lesson?.progress) {
      tiles.push({
        value: `${completedActivityCount}/${activities.length}`,
        label: 'Activities',
        icon: 'check',
        color: colors.green,
      });
    }

    tiles.push({ value: durationLabel, label: 'Duration', icon: 'clock', color: colors.primary });
    tiles.push({
      value: `${LESSON_XP_REWARD}`,
      label: 'XP Reward',
      icon: 'star',
      color: colors.yellow,
    });

    /*
     * Difficulty replaces the `Chip` that was illegally nested in a `Text`.
     *
     * This used to title-case `lesson.difficulty` with `charAt`/`slice`, on the
     * assumption it was one of the words 'EASY' / 'MEDIUM' / 'HARD'. It is a 1-5
     * number, and until recently the roadmap payload dropped it altogether — so
     * the guard above was always false and this tile simply never rendered.
     * Calling string methods on it would have crashed the screen the moment the
     * server started sending the field.
     */
    const band = difficultyBand(lesson?.difficulty);
    if (band) {
      tiles.push({
        value: band.label,
        label: 'Difficulty',
        icon: 'chart',
        color: colors[band.tone],
      });
    }

    return tiles;
  }, [lesson?.progress, lesson?.difficulty, completedActivityCount, activities.length, durationLabel]);

  const header = (
    <PageHeader
      title={lesson?.title || 'Lesson'}
      subtitle={
        activities.length > 0
          ? `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`
          : undefined
      }
      onBack={() => navigation.goBack()}
    />
  );

  // ---- Non-content states -------------------------------------------------

  if (lessonLoading || activitiesLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} scroll={false} header={header}>
        <View style={styles.center}>
          <PetalMark size={96} loading />
          <Text style={[typography.presets.caption, styles.loadingText]}>Loading lesson…</Text>
        </View>
      </AppShell>
    );
  }

  if (lessonError || activitiesError) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn’t load this lesson"
            message={toUserMessage(lessonErrorObj ?? activitiesErrorObj)}
            onRetry={handleRefresh}
          />
        </View>
      </AppShell>
    );
  }

  if (!lesson) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            icon="search"
            title="Lesson not found"
            message="This lesson doesn’t exist or has been removed."
          />
        </View>
      </AppShell>
    );
  }

  // ---- Content ------------------------------------------------------------

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson}
      header={header}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      footer={
        <PrimaryButton
          label={lesson.isCompleted ? 'Lesson Completed' : 'Complete Lesson'}
          icon="check"
          tone={lesson.isCompleted ? 'green' : 'brand'}
          onPress={handleCompleteLesson}
          loading={completeLessonMutation.isPending}
          disabled={lesson.isCompleted}
          accessibilityHint="Marks this lesson as finished"
        />
      }
    >
      <View style={styles.column}>
        <Card variant="raised" padding="roomy" accent={colors.primary} rail>
          <View style={styles.infoTop}>
            <View style={styles.infoText}>
              <Text style={[typography.presets.eyebrow, styles.eyebrow]}>Lesson</Text>
              <Text style={[typography.presets.section, styles.lessonTitle]}>{lesson.title}</Text>
            </View>
            <StatusBadge
              status={
                lesson.isCompleted ? 'completed' : percent > 0 ? 'current' : 'available'
              }
            />
          </View>

          {lesson.description ? (
            <Text style={[typography.presets.body, styles.description]}>{lesson.description}</Text>
          ) : null}

          {lesson.progress ? (
            <ProgressIndicator
              value={percent}
              label="Lesson progress"
              showPercentage
              color={lesson.isCompleted ? colors.green : colors.purple}
              style={styles.progress}
              accessibilityLabel={`${completedActivityCount} of ${activities.length} activities complete`}
            />
          ) : null}

          <StatGrid stats={stats} style={styles.stats} />
        </Card>

        <View style={styles.sectionHeader}>
          <PetalIcon name="explore" size={18} color={colors.text} />
          <View style={styles.sectionText}>
            <Text
              style={[typography.presets.cardTitle, styles.sectionTitle]}
              accessibilityRole="header"
            >
              Activities
            </Text>
            <Text style={[typography.presets.caption, styles.sectionSubtitle]}>
              {allActivitiesCompleted
                ? 'Every activity is done — finish the lesson below!'
                : 'Work through each one from top to bottom.'}
            </Text>
          </View>
        </View>

        {activities.length === 0 ? (
          <EmptyState
            icon="pencil"
            title="No activities yet"
            message="Activities will appear here when they’re ready."
          />
        ) : (
          <View style={styles.activityList}>
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                // normalizeActivityType returns a strict subset of ActivityCardKind.
                kind={normalizeActivityType(activity.activityType)}
                title={activity.title}
                meta={
                  activity.video?.duration
                    ? `${Math.ceil(activity.video.duration / 60)} mins`
                    : undefined
                }
                completed={isActivityDone(activity, lesson.progress)}
                onPress={() => handleActivityPress(activity)}
              />
            ))}
          </View>
        )}
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoText: {
    /* Lets a long title wrap instead of pushing the badge off the card. */
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.primary,
  },
  lessonTitle: {
    color: colors.text,
  },
  description: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  progress: {
    marginTop: spacing.lg,
  },
  stats: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sectionText: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  sectionTitle: {
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
  },
  activityList: {
    gap: spacing.sm,
  },
});

export default LessonScreen;
