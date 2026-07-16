import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { ProgressBar } from '../../components/ui';
import { useStory, useStoryProgress, useStartStory, useUpdateStoryPage, useCompleteStory } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

type RouteParams = { storyId: string; progressId?: string };

export const StoryReaderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { storyId, progressId: initialProgressId } = route.params;

  const { data: storyRes, isLoading, isError, error } = useStory(storyId);
  const { data: progressRes, refetch: refetchProgress } = useStoryProgress(storyId);
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

  if (!initialProgressId && initializing) {
    return (
      <ScreenContainer>
        <TopBar title="Story Reader" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Preparing story..." />
        </View>
      </ScreenContainer>
    );
  }

  if (isLoading || initializing) {
    return (
      <ScreenContainer>
        <TopBar title="Story Reader" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Loading story..." />
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !story || totalPages === 0) {
    return (
      <ScreenContainer>
        <TopBar title="Story Reader" showBack />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load story"
            message={toUserMessage(error)}
            onRetry={refetchProgress}
          />
        </View>
      </ScreenContainer>
    );
  }

  const page = pages[currentPage];

  if (!page) {
    return (
      <ScreenContainer>
        <TopBar title="Story Reader" showBack />
        <View style={styles.center}>
          <ErrorState title="Page not found" message="This page could not be loaded." />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TopBar title={story.title ?? 'Story'} showBack />
      <View style={styles.container}>
        <View style={styles.progressSection}>
          <ProgressBar
            progress={completionPercent}
            color={colors.purple}
            style={styles.readerProgress}
          />
          <View style={styles.progressInfo}>
            <Text style={styles.pageIndicator}>
              Page {currentPage + 1} of {totalPages}
            </Text>
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.timerText}>
                {Math.floor(readingSeconds / 60)}:{(readingSeconds % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.illustrationPlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
            <Text style={styles.illustrationLabel}>Illustration</Text>
          </View>

          <AppCard style={styles.contentCard}>
            <Text style={styles.pageContent}>{page.content}</Text>
          </AppCard>

          {page.hint ? (
            <View style={styles.hintRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.yellow} />
              <Text style={styles.hintText}>{page.hint}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.controls}>
          <AppButton
            label="Back"
            onPress={handlePrev}
            variant="secondary"
            disabled={isFirstPage}
            style={styles.navBtn}
          />
          {isLastPage ? (
            <AppButton
              label="Finish"
              onPress={handleFinish}
              variant="success"
              loading={completeStory.isPending}
              style={styles.navBtn}
            />
          ) : (
            <AppButton
              label="Next"
              onPress={handleNext}
              variant="primary"
              loading={updatePage.isPending}
              style={styles.navBtn}
            />
          )}
        </View>
      </View>
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
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  readerProgress: {
    marginBottom: spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageIndicator: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  contentScroll: {
    flex: 1,
  },
  illustrationPlaceholder: {
    height: 160,
    borderRadius: radius.card,
    backgroundColor: `${colors.purple}08`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  illustrationLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  contentCard: {
    marginBottom: spacing.md,
  },
  pageContent: {
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 26,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: `${colors.yellow}15`,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  hintText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  navBtn: {
    flex: 1,
  },
});

export default StoryReaderScreen;
