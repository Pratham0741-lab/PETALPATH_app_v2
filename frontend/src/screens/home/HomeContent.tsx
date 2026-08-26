import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ErrorState } from '../../components/common/ErrorState';
import { toUserMessage } from '../../api/errors';
import { useChildStore } from '../../store/childStore';
import { useRoadmapStore, Lesson } from '../../store/roadmapStore';
import { colors, radius, shadows, spacing, typography, cardSizes } from '../../theme';
import { navigateToActivity } from '../../utils/navigationFlow';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';
import {
  useRoadmap,
  useDashboardOverview,
  useRewardsOverview,
} from '../../hooks/useLearningQueries';
import { useDailyStreak } from '../../hooks/useRewards';
import { useChildSwitch } from '../../hooks/useChildSwitch';
import { deriveXPState } from '../../services/gamification/derivations';
import type {
  MasteryStateName,
  RoadmapPracticeSession,
  RoadmapReview,
  RoadmapReviewGate,
} from '../../services/api/learningApi';
import {
  AppShell,
  AppHeader,
  AvatarGlyph,
  Card,
  ContinueLearningCard,
  PetalIcon,
  PrimaryButton,
  Roadmap,
  RoadmapNodeData,
  RoadmapSectionData,
  RoadmapNodeStatus,
  SceneBand,
} from '../../components/design';

/**
 * Home — the Learning Journey (spec §10-§13).
 *
 * One implementation for all three device variants. The mobile/tablet/desktop
 * files were previously ~1660-line copies of each other that differed only in
 * decorative sizes, which is exactly the duplication §28 rules out; the
 * variant now only widens the column.
 *
 * The screen owns the data, the design system owns the looks. Data wiring is
 * unchanged: the same focus-refetch (without which newly unlocked lessons don't
 * appear), and the same `selectLesson` -> navigate contract.
 */

export type HomeVariant = 'mobile' | 'tablet' | 'desktop';

/** Caps the reading width on big screens instead of stretching the roadmap. */
const MAX_WIDTH: Record<HomeVariant, number | undefined> = {
  mobile: undefined,
  tablet: 660,
  desktop: 820,
};

type ActivityKindKey = 'video' | 'listen' | 'speak' | 'write';

const ACTIVITY_WORDS: Record<string, string> = {
  video: 'Watch & Learn',
  listen: 'Listen & Choose',
  speak: 'Speak & Learn',
  write: 'Trace & Draw',
  drag_drop: 'Match & Learn',
  stories: 'Story Time',
};

const NEXT_KIND: Record<string, 'watch' | 'listen' | 'speak' | 'trace' | 'match'> = {
  video: 'watch',
  listen: 'listen',
  speak: 'speak',
  write: 'trace',
  drag_drop: 'match',
};

/**
 * The one-line reason shown on a review card.
 *
 * Deliberately not the server's `reason`. That string is a full sentence
 * written for a parent — "“Sorting Big and Small” is fading, it has not been
 * practiced in a while." — and the roadmap card renders its second line with
 * `numberOfLines={1}`, so the sentence would arrive clipped mid-word. The whole
 * sentence is shown in the Practice-first block above the journey, where it has
 * room to wrap; here the state gets three or four words a child can read.
 */
const REVIEW_CAPTIONS: Record<MasteryStateName, string> = {
  WEAK: 'Needs practice',
  LEARNING: 'Still learning',
  STRONG: 'Keep it strong',
  MASTERED: 'Quick refresher',
  NEW: 'Practice again',
};

const reviewCaption = (state: MasteryStateName | null | undefined): string =>
  (state && REVIEW_CAPTIONS[state]) || 'Practice again';

export interface HomeContentProps {
  variant?: HomeVariant;
}

export const HomeContent: React.FC<HomeContentProps> = ({ variant = 'mobile' }) => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const childrenList = useChildStore((state) => state.childrenList);
  const selectLesson = useRoadmapStore((state) => state.selectLesson);

  const scrollViewRef = useRef<ScrollView>(null);
  const hasAutoScrolled = useRef(false);
  /** Roadmap's y inside the scroll content, added to the node's own offset. */
  const roadmapTop = useRef(0);

  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [activeLessonY, setActiveLessonY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const maxWidth = MAX_WIDTH[variant];

  // ----------------------------------------------------------------- queries
  const {
    data: rawRoadmap,
    isLoading: roadmapLoading,
    error: roadmapError,
    refetch: refetchRoadmap,
  } = useRoadmap();

  const { data: rawDashboard, refetch: refetchDashboard } = useDashboardOverview();
  const { data: rawRewards, refetch: refetchRewards } = useRewardsOverview();
  const { data: rawStreak, refetch: refetchStreak } = useDailyStreak();

  const { switchChild } = useChildSwitch();

  // Refetch on focus so lessons unlocked in an activity appear immediately.
  useFocusEffect(
    useCallback(() => {
      refetchRoadmap();
      refetchDashboard();
      refetchRewards();
      refetchStreak();
    }, [refetchRoadmap, refetchDashboard, refetchRewards, refetchStreak]),
  );

  // -------------------------------------------------------------------- data
  const roadmapData = (rawRoadmap as any)?.data;
  const themes = (roadmapData?.themes ?? []) as any[];
  const nodes = (roadmapData?.nodes ?? []) as any[];
  const currentLesson = (roadmapData?.currentNode ?? null) as any;

  /*
   * What the adaptive engine wants practiced before the journey moves on,
   * highest priority first. The server has been sending this since the roadmap
   * projection learned to read the review queue; until now nothing rendered it,
   * so a child with six skills going stale saw an ordinary path.
   *
   * Keyed by lesson id because each review points at a lesson already in
   * `nodes[]` — it is an ordering, not extra content.
   */
  const reviews = (roadmapData?.reviews ?? []) as RoadmapReview[];
  const reviewGate = (roadmapData?.reviewGate ?? null) as RoadmapReviewGate | null;
  const reviewById = useMemo(
    () => new Map(reviews.map((r) => [r.lessonId, r])),
    [reviews],
  );

  /*
   * The same reviews, described as one stop to draw in front of the day's new
   * lesson — which is where a child looks, rather than back up the path at
   * lessons they finished weeks ago.
   *
   * Null on three occasions: nothing due and nothing practiced today, a grade
   * with no curriculum, or a server that predates the field. In all three the
   * `reviewById` recolouring below is the fallback, which is why that code stays.
   * When a stop *does* exist the recolouring is suppressed: two purple circles
   * for one obligation reads as two obligations, and a stop saying "2 skills to
   * practice" beside three purple lessons contradicts itself.
   */
  const practiceSession = (roadmapData?.practiceSession ?? null) as RoadmapPracticeSession | null;

  const dashboardOverview = ((rawDashboard as any)?.data ?? {}) as any;
  const rewardsOverview = ((rawRewards as any)?.data ?? {}) as any;
  const streak = (rawStreak as any)?.data?.currentStreak ?? dashboardOverview.streak ?? 0;
  const xpState = deriveXPState(rewardsOverview.totalStars ?? 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRoadmap(), refetchDashboard(), refetchRewards(), refetchStreak()]);
    setRefreshing(false);
  }, [refetchRoadmap, refetchDashboard, refetchRewards, refetchStreak]);

  const handleChildSelect = async (childId: string) => {
    setShowChildDropdown(false);
    hasAutoScrolled.current = false;
    setActiveLessonY(0);
    await switchChild(childId);
  };

  // ------------------------------------------------------- activity helpers
  const getNextIncompleteActivity = useCallback((lesson: Lesson) => {
    const progress = lesson.progress;
    if (!progress) return lesson.activities[0] || null;
    for (const act of lesson.activities) {
      if (act.activityType === 'video' && !progress.videoCompleted) return act;
      if (act.activityType === 'listen' && !progress.listenCompleted) return act;
      if (act.activityType === 'speak' && !progress.speakCompleted) return act;
      if (act.activityType === 'write' && !progress.writeCompleted) return act;
    }
    return lesson.activities[0] || null;
  }, []);

  const getRemainingActivitiesCount = useCallback((lesson: Lesson) => {
    const progress = lesson.progress;
    if (!progress) return lesson.activities.length;
    let completed = 0;
    if (progress.videoCompleted) completed++;
    if (progress.listenCompleted) completed++;
    if (progress.speakCompleted) completed++;
    if (progress.writeCompleted) completed++;
    return Math.max(0, lesson.activities.length - completed);
  }, []);

  // Both navigation paths must select the lesson first — the activity stores
  // read the selected lesson, so navigating without it renders an empty screen.
  const handleResume = async () => {
    if (!currentLesson) return;
    await selectLesson(currentLesson);
    const targetActivity = getNextIncompleteActivity(currentLesson);
    if (targetActivity) {
      await navigateToActivity(navigation, targetActivity);
    } else {
      navigation.navigate('LessonOverview', { lessonId: currentLesson.id });
    }
  };

  const handleLessonClick = useCallback(
    async (lesson: Lesson) => {
      if (lesson.isUnlocked || lesson.isCompleted) {
        await selectLesson(lesson);
        navigation.navigate('LessonOverview', { lessonId: lesson.id });
      }
    },
    [navigation, selectLesson],
  );

  // ------------------------------------------------------- roadmap sections
  const sections = useMemo<RoadmapSectionData[]>(() => {
    if (themes.length === 0 || nodes.length === 0) return [];

    const currentThemeId = currentLesson?.themeId ?? themes[0].id;
    const currentThemeIdx = Math.max(
      0,
      themes.findIndex((t) => t.id === currentThemeId),
    );

    /*
     * The practice stop, built once.
     *
     * A `review`-status stop of `practice` kind, so it inherits the purple fill,
     * the replay glyph and the word "Practice" that reviews already use — and
     * turns into the ordinary green tick the moment the day's practice is done,
     * with no second set of colours to keep in step. Kind, not status, was the
     * cheaper choice in every direction: nothing had to learn a sixth state.
     *
     * It carries no `stars`: the stars on a review are last time's result for
     * that lesson, and a stop covering two lessons has no single result to show.
     */
    const stopTakesFocus = !!practiceSession && !practiceSession.isCompleted && practiceSession.isBlocking;
    const practiceStop: RoadmapNodeData | null = practiceSession
      ? {
          id: practiceSession.id,
          title: practiceSession.title,
          subtitle: practiceSession.subtitle,
          status: practiceSession.isCompleted ? 'completed' : 'review',
          kind: 'practice',
          focus: stopTakesFocus,
          /*
           * The queue screen, not one of the lessons. On a two-skill day opening
           * one lesson silently drops the other, and the stop is the only thing
           * that knows there were two. It costs a tap on a one-skill day and buys
           * a screen that can say what is being practiced and why.
           */
          onPress: () => navigation.navigate('ReinforcementQueue'),
        }
      : null;

    return themes.map((theme, tIdx) => {
      const themeNodes = nodes.filter((n) => n.themeId === theme.id);
      const done = themeNodes.filter((n) => n.isCompleted).length;
      const expanded = tIdx === currentThemeIdx;

      const section: RoadmapSectionData = {
        id: theme.id,
        title: theme.title,
        subtitle:
          themeNodes.length > 0
            ? `${done} of ${themeNodes.length} lessons complete`
            : 'Coming soon',
        progress: themeNodes.length > 0 ? (done / themeNodes.length) * 100 : 0,
        locked: tIdx > currentThemeIdx,
        icon: tIdx < currentThemeIdx ? 'check' : 'seedling',
        color:
          tIdx < currentThemeIdx
            ? colors.green
            : tIdx === currentThemeIdx
            ? colors.primary
            : colors.textMuted,
        expanded,
        /*
         * The open theme's header row is dropped because the Continue card
         * directly above it already carries both facts it would state — the
         * theme name as its eyebrow and "N of M lessons complete" over its
         * track. Gated on `currentLesson` so a grade with nothing left to
         * continue keeps its header rather than losing the tally entirely.
         */
        hideHeader: expanded && !!currentLesson,
      };

      if (!expanded) return section;

      /*
       * Lesson numbers count lessons, not stops.
       *
       * This was `nIdx + 1` over the mapped array, which would hand the practice
       * stop a number of its own and push the day's lesson to "6." in a
       * five-lesson theme whose subtitle still says "of 5". The counter advances
       * only for curriculum nodes, so the numbering keeps describing the
       * curriculum however many stops are spliced in.
       */
      let lessonNumber = 0;
      const stops: RoadmapNodeData[] = [];
      let stopPlaced = false;

      for (const node of themeNodes) {
        if (practiceStop && !stopPlaced && practiceSession?.beforeLessonId === node.id) {
          stops.push(practiceStop);
          stopPlaced = true;
        }

        lessonNumber++;

        /*
         * The in-place purple marking, kept as the fallback for a server that
         * predates `practiceSession`. When a stop exists it is suppressed: two
         * purple circles for one obligation reads as two obligations, and a stop
         * that says "2 skills to practice" beside three purple lessons is the app
         * contradicting itself.
         */
        const review = practiceSession ? undefined : reviewById.get(node.id);
        /*
         * `review` is tested before `isCompleted` on purpose: every review is a
         * lesson the child has already finished, so a completed-first ladder
         * would put a green tick on it and the whole feature would be invisible.
         */
        const status: RoadmapNodeStatus = review
          ? 'review'
          : node.isCompleted
          ? 'completed'
          : currentLesson && node.id === currentLesson.id
          ? 'current'
          : node.isUnlocked
          ? 'available'
          : 'locked';

        const left = getRemainingActivitiesCount(node);
        const isQuiz = /quiz|test/i.test(node.title ?? '');

        stops.push({
          id: node.id,
          title: `${lessonNumber}. ${node.title}`,
          subtitle: review
            ? reviewCaption(review.masteryState)
            : status === 'current' || status === 'available'
            ? `${left} ${left === 1 ? 'activity' : 'activities'} left`
            : undefined,
          status,
          /*
           * Under a hard gate the current node *is* the first review, which
           * leaves the run with no `current` node at all — so the halo and the
           * auto-scroll have to be told which stop matters rather than inferring
           * it from the status. Exactly one node may hold it: the halo, the
           * measured slot and the scroll report all key off `focus`, so if the
           * practice stop has taken it no lesson may also claim it.
           */
          focus: !stopTakesFocus && !!currentLesson && node.id === currentLesson.id,
          kind: isQuiz ? 'quiz' : 'lesson',
          stars: node.stars,
          onPress: () => handleLessonClick(node),
        });
      }

      /*
       * Nowhere to splice: either the grade is finished (`beforeLessonId` is
       * null) or the next lesson is in a later theme, which happens under a hard
       * gate when the section the child has open is the reviewed lesson's own.
       * The stop still belongs on the path — the server's `themeId` says where,
       * but Home only draws the expanded section, so the end of it is the only
       * place the child would actually see it.
       */
      if (practiceStop && !stopPlaced) {
        stops.push(practiceStop);
      }

      section.nodes = stops;

      return section;
    });
  }, [
    themes,
    nodes,
    currentLesson,
    reviewById,
    practiceSession,
    navigation,
    getRemainingActivitiesCount,
    handleLessonClick,
  ]);

  // --------------------------------------------------------------- auto-scroll
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    if (activeLessonY > 0 && !hasAutoScrolled.current && nodes.length > 5) {
      const target = activeLessonY - windowHeight * 0.25;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, target), animated: true });
      hasAutoScrolled.current = true;
    }
  }, [activeLessonY, nodes.length, windowHeight]);

  // ------------------------------------------------------------- daily goal
  /*
   * The goal card is gone from this screen, but the goal itself is not: these two
   * values are what `isTodayComplete` compares, and that still decides whether
   * the DAY COMPLETE card appears in place of the Continue card. Only the
   * percentage the deleted card drew was dropped.
   */
  const dailyGoal = useMemo(() => {
    if (dashboardOverview.dailyGoal && dashboardOverview.dailyGoal > 0) {
      return dashboardOverview.dailyGoal;
    }
    return currentLesson?.activities?.length ?? 4;
  }, [dashboardOverview, currentLesson]);

  const completedActivitiesToday = useMemo(() => {
    const p = currentLesson?.progress;
    if (!p) return 0;
    let count = 0;
    if (p.videoCompleted) count++;
    if (p.listenCompleted) count++;
    if (p.speakCompleted) count++;
    if (p.writeCompleted) count++;
    return count;
  }, [currentLesson]);

  const isTodayComplete =
    completedActivitiesToday >= dailyGoal ||
    (nodes.length > 0 && nodes.every((n: any) => n.isCompleted));

  const hoursUntilMidnight = useMemo(
    () => Math.max(1, 24 - new Date().getHours()),
    // Recomputed after each pull-to-refresh, as before.
    [refreshing],
  );

  // ------------------------------------------------------------------ header
  const otherChildren = childrenList.filter((c: any) => c.id !== activeChild?.id);

  const header = (
    <View style={styles.headerWrap}>
      <View style={[styles.column, maxWidth ? { maxWidth } : null]}>
        <AppHeader
          eyebrow={activeChild?.name ? `Hi ${activeChild.name}!` : 'Welcome back!'}
          title="Learning Journey"
          streak={streak}
          stars={xpState.xp}
          right={
            <Pressable
              onPress={() => setShowChildDropdown((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={`Switch profile. Currently ${
                activeChild?.name ?? 'no child'
              } selected.`}
              accessibilityState={{ expanded: showChildDropdown }}
              style={styles.childTrigger}
            >
              <AvatarGlyph species={activeChild?.avatar} size={34} />
              <PetalIcon
                name={showChildDropdown ? 'arrowUp' : 'arrowDown'}
                size={14}
                color={colors.textSecondary}
              />
            </Pressable>
          }
        />

        {showChildDropdown ? (
          <Card variant="raised" padding="compact" style={styles.dropdown}>
            {otherChildren.length > 0 ? (
              otherChildren.map((child: any) => (
                <Pressable
                  key={child.id}
                  style={styles.dropdownItem}
                  onPress={() => handleChildSelect(child.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${child.name}`}
                >
                  <AvatarGlyph species={child.avatar} size={26} />
                  <Text
                    style={[typography.presets.subtle, styles.dropdownText]}
                    numberOfLines={1}
                  >
                    {child.name}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={[typography.presets.caption, styles.dropdownEmpty]}>
                No other profiles
              </Text>
            )}
            <View style={styles.dropdownDivider} />
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setShowChildDropdown(false);
                navigation.navigate('ChildSelection');
              }}
              accessibilityRole="button"
              accessibilityLabel="Manage profiles"
            >
              <View style={styles.manageIcon}>
                <PetalIcon name="settings" size={14} color={colors.primary} />
              </View>
              <Text style={[typography.presets.subtle, { color: colors.primary }]}>
                Manage Profiles
              </Text>
            </Pressable>
          </Card>
        ) : null}
      </View>
    </View>
  );

  // ------------------------------------------------------------ early states
  if (roadmapLoading && nodes.length === 0) {
    return (
      <AppShell withBottomNav petals="light" scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.presets.body, styles.centerText]}>
            Growing your learning path…
          </Text>
        </View>
      </AppShell>
    );
  }

  if (roadmapError && nodes.length === 0) {
    return (
      <AppShell withBottomNav petals="light" scroll={false}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load your journey"
            message={toUserMessage(roadmapError)}
            onRetry={refetchRoadmap}
          />
        </View>
      </AppShell>
    );
  }

  if (nodes.length === 0) {
    return (
      <AppShell withBottomNav petals="light" scroll={false}>
        <View style={styles.center}>
          <AvatarGlyph species="flower" size={84} />
          <Text style={[typography.presets.section, styles.emptyTitle]}>
            Your garden is being planted
          </Text>
          <Text style={[typography.presets.body, styles.centerText]}>
            Your learning buddy is preparing the path. Pull down to check again.
          </Text>
          <PrimaryButton
            label="Refresh"
            icon="replay"
            fullWidth={false}
            onPress={onRefresh}
            style={styles.emptyButton}
          />
        </View>
      </AppShell>
    );
  }

  // ------------------------------------------------------------------ screen
  const nextActivity = currentLesson ? getNextIncompleteActivity(currentLesson) : null;
  const nextType = (nextActivity?.activityType ?? 'video') as ActivityKindKey;
  const remaining = currentLesson ? getRemainingActivitiesCount(currentLesson) : 0;
  const totalActs = currentLesson?.activities?.length ?? 0;

  /*
   * How far through the whole journey this child is, which is what the garden at
   * the foot of the screen is drawn from. Deliberately the *grade-wide* count and
   * not the current theme's: the band is the one place in the app that shows the
   * long view, and a garden that reset to bare stems each time a new theme opened
   * would punish the child for progressing.
   */
  const journeyProgress =
    nodes.length > 0
      ? (nodes.filter((n: any) => n.isCompleted).length / nodes.length) * 100
      : 0;

  /*
   * The open theme's tally, which the Continue card now carries because the
   * roadmap header row that used to state it is hidden for that theme. Counted
   * the same way `sections` counts it — same `nodes`, same `isCompleted` — so the
   * card and the path can never disagree about how many lessons are done.
   *
   * The theme is resolved through `themes` with the same `findIndex`-then-clamp
   * `sections` uses, not straight off `currentLesson.themeId`. A lesson whose
   * theme is missing from the list clamps to the first theme there, and it is
   * that theme's header the roadmap hides — so reading the id directly would
   * hide one theme's row and count another's.
   */
  const openTheme =
    themes.find((t: any) => t.id === currentLesson?.themeId) ?? themes[0] ?? null;
  const currentThemeNodes = openTheme
    ? nodes.filter((n: any) => n.themeId === openTheme.id)
    : [];
  const currentThemeDone = currentThemeNodes.filter((n: any) => n.isCompleted).length;
  const currentThemeTotal = currentThemeNodes.length;
  const themeProgress =
    currentThemeTotal > 0 ? (currentThemeDone / currentThemeTotal) * 100 : 0;

  const continueCard = currentLesson ? (
    <ContinueLearningCard
      eyebrow={openTheme?.title ?? 'Continue learning'}
      lessonTitle={currentLesson.title}
      nextActivity={ACTIVITY_WORDS[nextType] ?? 'Next activity'}
      nextActivityKind={NEXT_KIND[nextType] ?? 'watch'}
      progress={currentThemeTotal > 0 ? themeProgress : undefined}
      progressLabel={
        currentThemeTotal > 0
          ? `${currentThemeDone} of ${currentThemeTotal} ${
              currentThemeTotal === 1 ? 'lesson' : 'lessons'
            } complete`
          : undefined
      }
      ctaLabel={remaining === totalActs ? 'Start Lesson' : 'Continue Learning'}
      onPress={handleResume}
    />
  ) : null;

  return (
    <AppShell
      withBottomNav
      petals="light"
      sky
      scene={
        <SceneBand
          progress={journeyProgress}
          trail
          caption="Your garden grows with every lesson"
        />
      }
      header={header}
      scrollRef={scrollViewRef}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.column, maxWidth ? { maxWidth } : null]}>
        {/* CONTINUE LEARNING — the loudest thing on the screen (spec §13) */}
        {continueCard}

        {/* DAY COMPLETE */}
        {isTodayComplete ? (
          <Card variant="raised" padding="roomy" accent={colors.green} style={styles.doneCard}>
            <View style={styles.doneTop}>
              <View style={styles.doneIcon}>
                <PetalIcon name="trophy" size={26} color={colors.green} filled />
              </View>
              <View style={styles.flex}>
                <Text style={[typography.presets.cardTitle, { color: colors.text }]}>
                  Today's adventure complete!
                </Text>
                <Text style={[typography.presets.caption, styles.muted]}>
                  See you tomorrow — new lessons unlock in {hoursUntilMidnight}h.
                </Text>
              </View>
            </View>
            <View style={styles.donePills}>
              <View style={styles.donePill}>
                <PetalIcon name="star" size={13} color={colors.yellow} filled />
                <Text style={[typography.presets.caption, styles.donePillText]}>+20 XP</Text>
              </View>
              <View style={styles.donePill}>
                <PetalIcon name="sparkle" size={13} color={colors.purple} filled />
                <Text style={[typography.presets.caption, styles.donePillText]}>+1 Sticker</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/*
          * PRACTICE FIRST — the adaptive engine, said out loud.
          *
          * The long form of the practice stop further down the path. The stop is
          * where a child goes; this is where the reasons fit, one sentence per
          * skill, and it is the only place in the app with room to wrap them. The
          * shared purple and replay glyph are what tie the two together.
          *
          * Absent entirely when nothing is due, which is the common case. A child
          * who is up to date should not be shown an empty "reviews" shelf.
          */}
        {reviews.length > 0 ? (
          <View style={styles.reviewBlock}>
            <Text style={[typography.presets.eyebrow, styles.sectionEyebrow]}>Practice first</Text>
            <Card variant="raised" padding="normal" accent={colors.purple} rail>
              <View style={styles.recRow}>
                <View style={styles.reviewIcon}>
                  <PetalIcon name="replay" size={22} color={colors.purple} />
                </View>
                <View style={styles.flex}>
                  <Text style={[typography.presets.cardTitle, { color: colors.text }]}>
                    {reviewGate?.isBlocking
                      ? 'Practice this first'
                      : reviews.length === 1
                      ? 'One thing to practice'
                      : `${reviews.length} things to practice`}
                  </Text>
                  <Text style={[typography.presets.caption, styles.muted]}>
                    {reviewGate?.isBlocking
                      ? 'The next lesson opens once this is done.'
                      : 'A quick go now keeps it from slipping.'}
                  </Text>
                </View>
              </View>

              {reviews.map((review) => {
                const node = nodes.find((n) => n.id === review.lessonId);
                return (
                  <Pressable
                    key={review.lessonId}
                    onPress={node ? () => handleLessonClick(node) : undefined}
                    disabled={!node}
                    accessibilityRole="button"
                    accessibilityLabel={`Practice ${review.title}. ${review.reason}`}
                    style={({ pressed }) => [
                      styles.reviewRow,
                      pressed ? styles.reviewRowPressed : null,
                    ]}
                  >
                    <View style={styles.flex}>
                      <Text
                        numberOfLines={1}
                        style={[typography.presets.body, { color: colors.text }]}
                      >
                        {review.title}
                      </Text>
                      {/* The server's sentence, in full — two lines of room. */}
                      <Text numberOfLines={2} style={[typography.presets.caption, styles.muted]}>
                        {review.reason}
                      </Text>
                      {typeof review.stars === 'number' ? (
                        <View style={styles.reviewStars}>
                          {Array.from({ length: 3 }, (_, si) => (
                            <PetalIcon
                              key={si}
                              name="star"
                              size={13}
                              filled={si < review.stars}
                              color={si < review.stars ? colors.yellow : colors.border}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <PetalIcon name="forward" size={20} color={colors.purple} />
                  </Pressable>
                );
              })}

              {/*
                * Why the list stops where it does. `maxReviewsPerDay` capping the
                * list is very different from the engine having found nothing else,
                * and without this line the two are indistinguishable.
                */}
              {reviewGate && reviewGate.deferredCount > 0 ? (
                <Text style={[typography.presets.caption, styles.reviewNote]}>
                  {reviewGate.deferredCount} more{' '}
                  {reviewGate.deferredCount === 1 ? 'skill is' : 'skills are'} waiting for another
                  day.
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        {/*
          * THE JOURNEY (spec §10, §11) — deliberately the last block.
          *
          * It used to sit directly under the two summary cards, which buried
          * everything after it: a grade is twenty-seven lessons, so "today's
          * adventure complete" and the recommended story were several screens below
          * the fold and effectively never seen. Ending on the journey also lets the
          * trail in the garden band below read as the path continuing into the
          * ground rather than as an unrelated illustration.
          *
          * Source order only — same components, same data, same handlers. The
          * auto-scroll still lands correctly because `roadmapTop` is measured in
          * `onLayout` rather than assumed.
          */}
        <Text style={[typography.presets.eyebrow, styles.sectionEyebrow]}>Your journey</Text>
        <View
          style={styles.roadmap}
          onLayout={(e) => {
            roadmapTop.current = e.nativeEvent.layout.y;
          }}
        >
          <Roadmap
            sections={sections}
            // Roadmap reports the node relative to itself; adding the roadmap's
            // own offset makes it a scroll position.
            onCurrentNodeLayout={(frame) => setActiveLessonY(roadmapTop.current + frame.y)}
          />
        </View>
      </View>

      <NavigationGuide
        screenKey="roadmap"
        guideKey="roadmap"
        message="Welcome to PetalPath! Tap the glowing lesson to keep growing."
      />
    </AppShell>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  /** Centres and caps the content column on tablet/desktop (spec §27). */
  column: {
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  centerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.xl,
  },
  muted: {
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ----------------------------------------------------------------- header
  headerWrap: {
    zIndex: 20,
  },
  childTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 2,
    minHeight: 44,
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    minWidth: 176,
    zIndex: 30,
    ...shadows.lg,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  dropdownText: {
    color: colors.text,
    /* Sits beside an avatar in a fixed-width dropdown, and RN defaults
       flexShrink to 0 — without this a long child name runs past the panel. */
    flexShrink: 1,
  },
  dropdownEmpty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  manageIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --------------------------------------------------------------- roadmap
  sectionEyebrow: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  roadmap: {
    /* Zero, not a gutter: the garden band is rendered immediately below this and
       its trail has to meet the end of the path. The last row already leaves ~38px
       of empty space under its node, which is all the breathing room needed. */
    marginBottom: 0,
  },

  // ------------------------------------------------------------ day complete
  doneCard: {
    marginTop: spacing.sm,
  },
  doneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  doneIcon: {
    width: cardSizes.iconWell,
    height: cardSizes.iconWell,
    borderRadius: radius.cardInner,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  donePillText: {
    color: colors.text,
  },

  // ------------------------------------------------------ practice / reviews
  /** Icon well, text, chevron — shared by every card-with-a-leading-glyph here. */
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reviewBlock: {
    marginTop: spacing.sm,
  },
  reviewIcon: {
    width: cardSizes.iconWellSmall,
    height: cardSizes.iconWellSmall,
    borderRadius: radius.cardInner,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Separated by a rule rather than a gap: these are one list, not three cards. */
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  reviewRowPressed: {
    opacity: 0.85,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },
  reviewNote: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

export default HomeContent;
