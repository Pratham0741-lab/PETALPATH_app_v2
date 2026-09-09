import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { customAlert } from '../../utils/alert';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { api } from '../../api/client';
import { navigateToActivity } from '../../utils/navigationFlow';
import { normalizeActivityType } from '../../utils/activityNormalization';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { colors, spacing, typography, cardSizes } from '../../theme';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { PetalMark } from '../../components/brand/PetalMark';
import {
  ActivityCard,
  AppShell,
  Card,
  MentorCard,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  StatusBadge,
} from '../../components/design';

/**
 * Lesson Overview (spec §34 phase 4) — the activities inside one lesson.
 *
 * One implementation for all three device variants. The tablet and desktop
 * files were byte-identical apart from a 280px vs 320px sidebar, and mobile
 * differed only in dropping that sidebar, so the variant now controls exactly
 * those two things (spec §28).
 *
 * Nothing about the lesson flow changed: the roadmap store is still the only
 * data source, the focus listener still reloads the roadmap, the
 * activity-unlock rule is unchanged, tapping an activity still pings
 * `/activities/:id` before `navigateToActivity`, and "Complete Lesson" still
 * calls `completeLesson` and confirms with the same alert.
 */

export type LessonOverviewVariant = 'mobile' | 'tablet' | 'desktop';

/** Only the sidebar width differs between the two wide variants. */
const SIDEBAR_WIDTH: Record<LessonOverviewVariant, number> = {
  mobile: 0,
  tablet: 280,
  desktop: 320,
};

/**
 * Strips the lesson's own name off an activity title.
 *
 * Content is authored as "Letter G", "Letter G Video", "Letter G Trace" …, so on
 * a page already headed "Letter G" every row restated it and the part that
 * actually differs — Video, Trace — was pushed to the end of a truncating line.
 * Falls back to the full title whenever removing the prefix would leave nothing,
 * so a lesson whose single activity shares its name still reads properly.
 */
const stripLessonName = (activityTitle: string, lessonTitle?: string): string => {
  if (!lessonTitle) return activityTitle;
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const lesson = norm(lessonTitle);
  if (!lesson || !norm(activityTitle).startsWith(lesson)) return activityTitle;

  // Cut on the raw string, not the normalised one, so casing and spacing survive.
  const rest = activityTitle.slice(lessonTitle.length).replace(/^[\s:–—-]+/, '').trim();
  return rest.length > 0 ? rest : activityTitle;
};

export const LessonOverviewContent: React.FC<{ variant?: LessonOverviewVariant }> = ({
  variant = 'mobile',
}) => {
  const wide = variant !== 'mobile';
  const { navigateToTab, navigation } = useAppNavigation();

  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

  const { selectedLesson, activities, loading, error, completeLesson, completedLessons } =
    useRoadmapStore();

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      useRoadmapStore.getState().loadRoadmap();
    });
    return unsubscribe;
  }, [navigation]);

  // Unchanged rule: an activity opens once the one before it is done.
  const isActivityUnlocked = (act: any, index: number) => {
    if (index === 0) return true;
    const prevAct = activities[index - 1];
    const progress = selectedLesson?.progress;
    if (!progress) return false;

    const prevType = normalizeActivityType(prevAct.activityType);
    if (prevType === 'video') return progress.videoCompleted;
    if (prevType === 'listen') return progress.listenCompleted;
    if (prevType === 'speak') return progress.speakCompleted;
    if (prevType === 'write') return progress.writeCompleted;
    if (prevType === 'drag_drop') return true;

    return true;
  };

  /**
   * Reads the same four progress flags the unlock rule uses, so a finished
   * activity can show a check instead of only being "not locked" — state that
   * was already in the store but had nowhere to render (spec §30: don't signal
   * with colour alone).
   */
  const isActivityCompleted = (act: any) => {
    const progress = selectedLesson?.progress;
    if (!progress) return false;
    const type = normalizeActivityType(act.activityType);
    if (type === 'video') return !!progress.videoCompleted;
    if (type === 'listen') return !!progress.listenCompleted;
    if (type === 'speak') return !!progress.speakCompleted;
    if (type === 'write') return !!progress.writeCompleted;
    return false;
  };

  const handleActivityPress = async (act: any) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`Activity selected: ${act.id}`);
    try {
      await api.get(`/activities/${act.id}`);
    } catch (err) {
      if (__DEV__) console.warn('Failed to log activity selection on backend:', err);
    }
    await navigateToActivity(navigation, act);
  };

  const goToJourney = useCallback(() => {
    // `navigateToTab` already handles the mobile-tabs vs wide-stack difference,
    // which is what the two old variant files were branching on by hand.
    navigateToTab('Journey');
  }, [navigateToTab]);

  const handleCompleteLesson = () => {
    if (selectedLesson) {
      completeLesson(selectedLesson.id);
      customAlert(
        'Lesson Completed!',
        `Congratulations, you completed "${selectedLesson.title}"!`,
        [{ text: 'OK', onPress: goToJourney }],
      );
    }
  };

  const isCompleted = selectedLesson ? completedLessons.includes(selectedLesson.id) : false;

  const doneCount = useMemo(
    () => activities.filter((a: any) => isActivityCompleted(a)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, selectedLesson?.progress],
  );
  const percent = activities.length > 0 ? Math.round((doneCount / activities.length) * 100) : 0;

  const header = (
    <PageHeader
      title={selectedLesson?.title || 'Lesson Overview'}
      // No activity count here: the "Activities done" tile and the list heading
      // below both carry it already.
      backFallback={goToJourney}
      centered={!wide}
    />
  );

  // ---- Non-content states -------------------------------------------------

  if (loading && activities.length === 0) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} scroll={false} header={header}>
        <View style={styles.center}>
          <PetalMark size={96} loading />
          <Text style={[typography.presets.caption, styles.loadingText]}>Loading lesson…</Text>
        </View>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this lesson"
            message={error}
            onRetry={() => useRoadmapStore.getState().loadRoadmap()}
          />
        </View>
      </AppShell>
    );
  }

  if (!selectedLesson) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            icon="seedling"
            title="No lesson selected"
            message="Pick a lesson from your learning path to see what's inside."
          />
        </View>
      </AppShell>
    );
  }

  // ---- Pieces shared by both layouts --------------------------------------

  const sequenceHeading = (
    <View style={styles.sectionHeader}>
      <Text style={[typography.presets.title, styles.sectionTitle]} accessibilityRole="header">
        Activities
      </Text>
    </View>
  );

  const activityList =
    activities.length === 0 ? (
      <EmptyState
        icon="pencil"
        title="No activities yet"
        message="This lesson's activities will appear here when they're ready."
      />
    ) : (
      activities.map((act: any, index: number) => (
        <ActivityCard
          key={act.id}
          // normalizeActivityType returns a strict subset of ActivityCardKind.
          kind={normalizeActivityType(act.activityType)}
          title={stripLessonName(act.title, selectedLesson.title)}
          meta={
            act.video?.duration ? `${Math.ceil(act.video.duration / 60)} mins` : '5 mins'
          }
          completed={isActivityCompleted(act)}
          locked={!isActivityUnlocked(act, index)}
          onPress={() => handleActivityPress(act)}
          style={styles.activity}
        />
      ))
    );

  const completeButton = (
    <PrimaryButton
      label={isCompleted ? 'Re-complete Lesson' : 'Mark Lesson Complete'}
      icon={isCompleted ? 'replay' : 'check'}
      onPress={handleCompleteLesson}
      accessibilityHint="Marks every activity in this lesson as finished"
    />
  );

  // ---- Mobile: one column, sticky CTA -------------------------------------

  if (!wide) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} header={header} footer={completeButton}>
        {sequenceHeading}
        {activityList}
      </AppShell>
    );
  }

  // ---- Tablet / desktop: activities beside a status rail ------------------

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.lesson} scroll={false} padded={false} header={header}>
      <View style={styles.layout}>
        <ScrollView
          style={styles.main}
          contentContainerStyle={styles.mainContent}
          showsVerticalScrollIndicator={false}
        >
            {sequenceHeading}
          {activityList}
        </ScrollView>

        <View style={[styles.sidebar, { width: SIDEBAR_WIDTH[variant] }]}>
          <Text style={[typography.presets.cardTitle, styles.sidebarTitle]}>Lesson status</Text>

          <Card variant="raised" padding="normal" style={styles.card}>
            <StatusBadge status={isCompleted ? 'completed' : percent > 0 ? 'current' : 'available'} />
            <Text style={[typography.presets.caption, styles.sidebarNote]}>
              {isCompleted
                ? 'Every activity in this lesson is finished.'
                : `${doneCount} of ${activities.length} activities done.`}
            </Text>
            <View style={styles.sidebarButton}>{completeButton}</View>
          </Card>

          <Text style={[typography.presets.cardTitle, styles.sidebarTitle]}>Your mentor</Text>
          <MentorCard
            name={activeMentor.name}
            species={activeMentor.species}
            color={activeMentor.color}
            selected
          />
        </View>
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  card: {
    marginBottom: cardSizes.gap,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    minWidth: 0,
  },
  lessonDescription: {
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  progressBlock: {
    marginTop: spacing.lg,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: colors.textSecondary,
  },
  progressValue: {
    color: colors.purple,
  },
  stats: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.text,
    /* Same halo as the page title: this heading sits straight on the scene now
       that the card above it is gone. */
    textShadowColor: 'rgba(255, 255, 255, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 7,
  },
  activity: {
    marginBottom: spacing.sm,
  },
  // Wide layout
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sidebar: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  sidebarTitle: {
    color: colors.text,
    marginTop: spacing.sm,
  },
  sidebarNote: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  sidebarButton: {
    marginTop: spacing.md,
  },
});

export default LessonOverviewContent;
