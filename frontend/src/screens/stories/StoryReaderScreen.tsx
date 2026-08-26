import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import {
  AppShell,
  Card,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  ProgressIndicator,
  SecondaryButton,
} from '../../components/design';
import { useStory, useStoryProgress, useStartStory, useUpdateStoryPage, useCompleteStory } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { colors, progressSizes, radius, spacing, typography, layoutSizes } from '../../theme';

/**
 * Story Reader (spec §35) — one page of a story at a time.
 *
 * The reading logic is untouched: the same five hooks, the same one-second
 * reading timer in a ref, the same `completionPercent`, the same save-then-
 * advance in `handleNext`, and `handleFinish` still replaces the route with
 * StoryCompletion after `completeStory`.
 *
 * What changed is the chrome. The title, progress bar and page readout are now a
 * pinned `AppShell` header and the Back/Next pair a pinned footer, so the page
 * text scrolls on its own instead of the whole screen moving — long pages used to
 * carry the controls off the bottom. Body text is 18px on a 28px line, which is
 * the point of a reading screen and was 16/26 before.
 *
 * The dashed 160px "Illustration" box is gone. `StoryPage.imageKey` exists in the
 * schema but nothing in the app resolves it to a URL, so the box was a promise of
 * artwork that cannot arrive (§33) — it took a third of the first screenful away
 * from the words. When illustrations are wired up they belong here, as an `Image`.
 *
 * One dead end is fixed: opening the reader with no progress id and no saved
 * progress left it on "Preparing story…" indefinitely, because the mutation that
 * would have created the progress record was written but never reachable. It is
 * now behind a Start Reading button.
 */

type RouteParams = { storyId: string; progressId?: string };

export const StoryReaderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { storyId, progressId: initialProgressId } = route.params;

  const { data: storyRes, isLoading, isError, error } = useStory(storyId);
  const {
    data: progressRes,
    isLoading: progressLoading,
    refetch: refetchProgress,
  } = useStoryProgress(storyId);
  const startStory = useStartStory();
  const updatePage = useUpdateStoryPage();
  const completeStory = useCompleteStory();

  const [currentPage, setCurrentPage] = useState(0);
  const [progressId, setProgressId] = useState(initialProgressId ?? '');
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [initializing, setInitializing] = useState(!initialProgressId);

  const story = storyRes?.data;
  const progress = progressRes?.data;
  const pages = story?.pages ?? [];
  const totalPages = pages.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage >= totalPages - 1;
  const completionPercent = totalPages > 0 ? Math.round(((currentPage + 1) / totalPages) * 100) : 0;

  useEffect(() => {
    if (progress) {
      setCurrentPage(progress.currentPage ?? 0);
      setProgressId(progress.id);
      setInitializing(false);
    }
  }, [progress]);

  useEffect(() => {
    if (progress && !initializing) {
      readingTimerRef.current = setInterval(() => {
        setReadingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
    };
  }, [progress, initializing]);

  const saveCurrentPage = useCallback(async (pageNum: number) => {
    if (!progressId) return;
    try {
      await updatePage.mutateAsync({
        storyId,
        pageNumber: pageNum,
      });
    } catch {
    }
  }, [storyId, progressId, updatePage]);

  const handleNext = useCallback(async () => {
    if (isLastPage) return;
    const nextPage = currentPage + 1;
    await saveCurrentPage(nextPage);
    setCurrentPage(nextPage);
  }, [currentPage, isLastPage, saveCurrentPage]);

  const handlePrev = useCallback(async () => {
    if (isFirstPage) return;
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
  }, [currentPage, isFirstPage]);

  const handleFinish = useCallback(async () => {
    try {
      await completeStory.mutateAsync({
        storyId,
        readingTime: readingSeconds,
      });
      await refetchProgress();
      navigation.replace('StoryCompletion', { storyId });
    } catch {
    }
  }, [storyId, readingSeconds, completeStory, refetchProgress, navigation]);

  const handleStartReading = useCallback(async () => {
    try {
      const result = await startStory.mutateAsync(storyId);
      setProgressId(result.data.id);
      setCurrentPage(0);
      setReadingSeconds(0);
      setInitializing(false);
    } catch {
    }
  }, [storyId, startStory]);

  /**
   * Arrived without a progress id and the server has no progress to resume. The
   * screen used to sit on "Preparing story…" for ever in this state — the
   * `handleStartReading` mutation it needed was written but never reachable from
   * the UI. It has a button now.
   */
  const needsStart = !initialProgressId && initializing && !progressLoading && !progress;

  if (needsStart) {
    return (
      <AppShell scroll={false} header={<PageHeader title={story?.title ?? 'Story'} />}>
        <View style={styles.center}>
          <Card variant="raised" padding="roomy" style={styles.startCard}>
            <Text style={[typography.presets.cardTitle, styles.startTitle]}>Ready to read?</Text>
            <Text style={[typography.presets.caption, styles.startBody]}>
              This story has not been started yet. Open it and we'll keep your place.
            </Text>
            <PrimaryButton
              label="Start Reading"
              icon="play"
              onPress={handleStartReading}
              loading={startStory.isPending}
            />
          </Card>
        </View>
      </AppShell>
    );
  }

  if (!initialProgressId && initializing) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story" />}>
        <View style={styles.center}>
          <LoadingSpinner label="Preparing story…" />
        </View>
      </AppShell>
    );
  }

  if (isLoading || initializing) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story" />}>
        <View style={styles.center}>
          <LoadingSpinner label="Loading story…" />
        </View>
      </AppShell>
    );
  }

  if (isError || !story || totalPages === 0) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story" />}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load story"
            message={toUserMessage(error)}
            onRetry={refetchProgress}
          />
        </View>
      </AppShell>
    );
  }

  const page = pages[currentPage];

  if (!page) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story" />}>
        <View style={styles.center}>
          <ErrorState title="Page not found" message="This page could not be loaded." />
        </View>
      </AppShell>
    );
  }

  const minutes = Math.floor(readingSeconds / 60);
  const seconds = (readingSeconds % 60).toString().padStart(2, '0');
  const pageReadout = `Page ${currentPage + 1} of ${totalPages}`;

  return (
    <AppShell
      petals="light"
      header={
        <View>
          <PageHeader title={story.title ?? 'Story'} />
          <View style={styles.progressSection}>
            <ProgressIndicator
              value={completionPercent}
              height={progressSizes.barHeightThin}
              color={colors.primary}
              accessibilityLabel={`${pageReadout}, ${completionPercent} percent read`}
            />
            <View style={styles.progressInfo}>
              <Text style={[typography.presets.caption, styles.pageIndicator]}>{pageReadout}</Text>
              <View style={styles.timerRow}>
                <PetalIcon name="clock" size={14} color={colors.textSecondary} />
                <Text style={[typography.presets.caption, styles.muted]}>
                  {minutes}:{seconds}
                </Text>
              </View>
            </View>
          </View>
        </View>
      }
      footer={
        <View style={styles.controls}>
          <SecondaryButton
            label="Back"
            icon="back"
            onPress={handlePrev}
            disabled={isFirstPage}
            fullWidth={false}
            style={styles.navBtn}
            accessibilityLabel="Previous page"
          />
          {isLastPage ? (
            <PrimaryButton
              label="Finish"
              icon="check"
              tone="green"
              onPress={handleFinish}
              loading={completeStory.isPending}
              fullWidth={false}
              style={styles.navBtn}
              accessibilityLabel="Finish story"
            />
          ) : (
            <PrimaryButton
              label="Next"
              iconRight="forward"
              onPress={handleNext}
              loading={updatePage.isPending}
              fullWidth={false}
              style={styles.navBtn}
              accessibilityLabel="Next page"
            />
          )}
        </View>
      }
    >
      <Card variant="raised" padding="roomy" style={styles.contentCard}>
        <Text style={[typography.presets.body, styles.pageContent]}>{page.content}</Text>
      </Card>

      {page.hint ? (
        <View style={styles.hintRow}>
          <PetalIcon name="info" size={16} color={colors.warning} />
          <Text style={[typography.presets.caption, styles.hintText]}>{page.hint}</Text>
        </View>
      ) : null}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  startCard: {
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: layoutSizes.reading,
  },
  startTitle: {
    color: colors.text,
    textAlign: 'center',
  },
  startBody: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  muted: {
    color: colors.textSecondary,
  },

  // -------------------------------------------------- pinned progress readout
  /* Matches `PageHeader`'s own gutter so the bar lines up with the title. */
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  pageIndicator: {
    color: colors.text,
    fontWeight: '700',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // ------------------------------------------------------------------ the page
  contentCard: {
    marginBottom: spacing.md,
  },
  pageContent: {
    color: colors.text,
    // A reading screen, so the words get the room: 18 on 28 rather than 16 on 26.
    fontSize: typography.sizes.lg,
    lineHeight: 28,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
  },
  hintText: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    lineHeight: 20,
  },

  controls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navBtn: {
    flex: 1,
  },
});

export default StoryReaderScreen;
