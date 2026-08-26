import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AppShell,
  Card,
  PageHeader,
  ParentRow,
  PetalIcon,
  StarRating,
  StatePanel,
} from '../../components/design';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useRoadmap } from '../../hooks/useLearningQueries';
import { useChildStore } from '../../store/childStore';
import { useRoadmapStore, Lesson } from '../../store/roadmapStore';
import { toUserMessage } from '../../api/errors';
import { colors, radius, spacing, typography } from '../../theme';
import type {
  RoadmapNode,
  RoadmapPayload,
  RoadmapReview,
  RoadmapReviewGate,
} from '../../services/api/learningApi';

/**
 * Practice queue — what the adaptive engine wants revisited, and why.
 *
 * Rebuilt on the roadmap payload. The previous version called
 * `/reinforcement/due` and `/reinforcement/history` and then filtered for
 * `status === 'due_now'`, a field the server has never sent, so the screen said
 * "All caught up!" to every child no matter how much was overdue. Its three
 * buttons posted to `/reinforcement/queue/:id/start`, `/skip` and `/complete` —
 * routes that do not exist in the reinforcement router, which only serves
 * `POST /process`, `GET /queue`, `GET /due`, `GET /history` and `GET /events`.
 * Every press was a 404 behind an "Updating..." line that never resolved.
 *
 * Everything here now comes from `GET /roadmap`, which is the one place the
 * engine's review plan is assembled: `reviews[]` is already ordered by priority,
 * carries the lesson each skill is practiced through, and carries a sentence
 * explaining why it came back. Sharing the query with Home also means the two
 * screens cannot disagree — they read the same React Query cache entry, so a
 * lesson practiced from Home has left this list by the time it is opened.
 *
 * There are no actions on a row but the obvious one. A review is finished by
 * doing the lesson, and the engine notices; "skip" and "complete" were buttons
 * that claimed a child had practiced something they had not.
 */

/** Plural-aware count, so no row ever reads "1 skills". */
const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const ReinforcementQueueScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const selectLesson = useRoadmapStore((state) => state.selectLesson);

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useRoadmap();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const payload = (data as { data?: RoadmapPayload } | undefined)?.data;
  const reviews: RoadmapReview[] = payload?.reviews ?? [];
  const gate: RoadmapReviewGate | null = payload?.reviewGate ?? null;
  const nodes: RoadmapNode[] = payload?.nodes ?? [];

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  /**
   * Open the lesson a review is practiced through.
   *
   * The cast is describing what the payload already is rather than hiding a
   * mismatch: `roadmapStore.loadRoadmap` assigns `currentLesson` straight from
   * this same response, and `selectLesson` only reads `.id` off what it is
   * given. Declaring the roadmap node as a `Lesson` here keeps the store's one
   * public contract intact instead of widening it for this screen.
   */
  const openReview = useCallback(
    async (review: RoadmapReview) => {
      const node = nodeById.get(review.lessonId);
      if (!node) return;
      await selectLesson(node as unknown as Lesson);
      navigation.navigate('LessonOverview', { lessonId: review.lessonId });
    },
    [navigation, nodeById, selectLesson],
  );

  const header = (
    <PageHeader
      title="Practice queue"
      subtitle="What needs another go, and why"
      centered={false}
    />
  );

  // ------------------------------------------------------------------- states
  if (!activeChild) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <EmptyState
            icon="profile"
            title="No child selected"
            message="Choose a child profile to see what the engine wants practiced."
          />
        </StatePanel>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell petals="light" header={header}>
        <Skeleton variant="card" height={132} style={styles.block} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="card" height={78} style={styles.block} />
        ))}
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <ErrorState
            title="Couldn't load the practice queue"
            message={toUserMessage(error)}
            onRetry={() => refetch()}
          />
        </StatePanel>
      </AppShell>
    );
  }

  /*
   * Nothing due is the good outcome and the common one, so it gets a real
   * message rather than a bare empty list. `dueCount` is checked alongside the
   * list because the two can differ: a skill can be due and still not be
   * offered today, either because the daily allowance is used up or because no
   * lesson on this child's journey teaches it.
   */
  if (reviews.length === 0) {
    const held = (gate?.deferredCount ?? 0) + (gate?.unreachableCount ?? 0);
    return (
      <AppShell
        petals="light"
        header={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <StatePanel>
          <EmptyState
            icon="sparkle"
            title="Nothing to practice"
            message={
              held > 0
                ? `Everything due today has been offered. ${plural(held, 'skill is', 'skills are')} waiting for another day.`
                : gate && gate.reviewsDoneToday > 0
                  ? `All caught up — ${plural(gate.reviewsDoneToday, 'skill', 'skills')} practiced today.`
                  : 'Every skill is holding steady. Finish a few more lessons and anything that starts to fade will appear here.'
            }
          />
        </StatePanel>
      </AppShell>
    );
  }

  const blocking = gate?.isBlocking ?? false;

  return (
    <AppShell
      petals="light"
      header={header}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ------------------------------------------------------------ summary */}
      <Card variant="raised" accent={colors.purple} rail style={styles.block}>
        <View style={styles.summaryHead}>
          <View style={styles.iconWell}>
            <PetalIcon name="replay" size={22} color={colors.purple} />
          </View>
          <View style={styles.flex}>
            <Text style={typography.presets.cardTitle}>
              {plural(reviews.length, 'skill to practice', 'skills to practice')}
            </Text>
            <Text style={[typography.presets.caption, styles.muted]}>
              {blocking
                ? 'The next new lesson stays shut until these are done.'
                : 'New lessons are still open — these are the ones losing their edge.'}
            </Text>
          </View>
        </View>

        {gate ? (
          <View style={styles.counts}>
            <ParentRow
              label="Due for review"
              description="Skills the engine has scheduled for today or earlier."
              value={String(gate.dueCount)}
              icon="clock"
              iconColor={colors.purple}
            />
            <ParentRow
              label="Practiced today"
              description={`Daily limit is ${gate.dailyAllowance}, so a bad week never turns into a wall of revision.`}
              value={`${gate.reviewsDoneToday} of ${gate.dailyAllowance}`}
              icon="check"
              iconColor={colors.success}
              divided
            />
            {gate.deferredCount > 0 ? (
              <ParentRow
                label="Held for another day"
                description="Due, but beyond today's limit. These come back tomorrow."
                value={String(gate.deferredCount)}
                icon="calendar"
                iconColor={colors.textSecondary}
                divided
              />
            ) : null}
            {gate.unreachableCount > 0 ? (
              <ParentRow
                label="No lesson to practice yet"
                description="Due, but nothing on this child's journey teaches it — usually a skill met in an assessment rather than a lesson."
                value={String(gate.unreachableCount)}
                icon="info"
                iconColor={colors.warning}
                divided
              />
            ) : null}
          </View>
        ) : null}
      </Card>

      {/* ------------------------------------------------------------- the list */}
      <Text style={[typography.presets.eyebrow, styles.eyebrow]}>In order</Text>

      <Card variant="flat" padding="compact" style={styles.block}>
        {reviews.map((review, index) => (
          <Pressable
            key={review.lessonId}
            onPress={() => openReview(review)}
            disabled={!nodeById.has(review.lessonId)}
            accessibilityRole="button"
            accessibilityLabel={`Practice ${review.title}`}
            accessibilityHint={review.reason}
            style={({ pressed }) => [
              styles.row,
              index > 0 ? styles.rowDivided : null,
              pressed ? styles.rowPressed : null,
            ]}
          >
            {/*
              The position is information here, not decoration: `reviews[]`
              arrives sorted by the engine's own priority, so "1" is the thing
              most worth doing first and the number is the only place that
              ordering is legible.
            */}
            <View style={styles.rank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>

            <View style={styles.flex}>
              <Text style={[typography.presets.body, styles.rowTitle]} numberOfLines={2}>
                {review.title}
              </Text>
              <Text style={[typography.presets.caption, styles.muted]}>{review.reason}</Text>
              <View style={styles.rowMeta}>
                <StarRating value={review.stars} size={13} />
                {review.recommendedModality ? (
                  <Text style={[typography.presets.caption, styles.modality]}>
                    Try it as {review.recommendedModality.toLowerCase()}
                  </Text>
                ) : null}
              </View>
            </View>

            <PetalIcon name="forward" size={20} color={colors.purple} />
          </Pressable>
        ))}
      </Card>

      {/*
        Said once, at the bottom, in the register a parent reads rather than the
        one a child does. Without it the queue looks like a punishment list; the
        point is that the engine is spacing practice out on purpose.
      */}
      <Text style={[typography.presets.caption, styles.footnote]}>
        Practice is scheduled by how well each skill is holding, not by a fixed
        timetable. A shaky skill comes back the next day, a solid one after two,
        and a skill that stays solid stops coming back.
      </Text>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  block: {
    marginBottom: spacing.lg,
  },
  muted: {
    color: colors.textSecondary,
  },
  eyebrow: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // ------------------------------------------------------------------ summary
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counts: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs,
  },

  // --------------------------------------------------------------- queue rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.presets.caption,
    color: colors.purpleDark,
    fontWeight: '800',
  },
  rowTitle: {
    color: colors.text,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modality: {
    color: colors.purpleDark,
  },

  footnote: {
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
});

export default ReinforcementQueueScreen;
