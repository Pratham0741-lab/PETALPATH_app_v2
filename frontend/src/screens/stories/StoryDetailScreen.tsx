import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import {
  AppShell,
  Card,
  IconWell,
  LessonStatus,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  ProgressIndicator,
  SecondaryButton,
  Stat,
  StatGrid,
  StatusBadge,
} from '../../components/design';
import { useStory, useStoryProgress, useStartStory } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, cardSizes } from '../../theme';

/**
 * Story Detail (spec §35) — reached from the recommendation card on Home.
 *
 * Restyled to match `SkillDetailScreen`, the app's other "here is one thing, do
 * you want to start it?" page: identity card, description, stats, progress,
 * actions pinned to the foot. It was the last family still on `ScreenContainer`
 * + `TopBar` + `AppCard` + Ionicons (§7, §33 "a different design language per
 * page").
 *
 * Every hook call is untouched — `useStory`, `useStoryProgress`,
 * `useStartStory`, and the three action shapes (Read Again / Resume + Start
 * Over / Start Reading) with the same navigation payloads.
 *
 * Two things fixed in passing: the 160×200 book-shaped placeholder was a fake
 * cover for an illustration the app does not have, so it is now an `IconWell`
 * the same size as every other identity card's; and Resume/Start Over carried
 * `flex: 1` inside a `gap`-stacked column, which does nothing there — the
 * footer stacks them properly.
 */

type RouteParams = { storyId: string };

/** Turns NON_FICTION into "Non fiction" for the eyebrow. */
const humanize = (value?: string | null) => {
  if (!value) return 'Story';
  const s = String(value).replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const StoryDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { storyId } = route.params;

  const { data: storyRes, isLoading, isError, error, refetch } = useStory(storyId);
  const { data: progressRes, refetch: refetchProgress } = useStoryProgress(storyId);
  const startStory = useStartStory();

  const story = storyRes?.data;
  const progress = progressRes?.data;
  const vocabCount = story?.vocabulary?.length ?? 0;
  const totalPages = story?.pages?.length ?? 0;
  const isCompleted = progress?.status === 'COMPLETED';
  const isInProgress = progress?.status === 'IN_PROGRESS' || (progress?.currentPage ?? 0) > 0;

  const handleStartReading = useCallback(async () => {
    try {
      const result = await startStory.mutateAsync(storyId);
      await refetchProgress();
      navigation.navigate('StoryReader', { storyId, progressId: result.data.id });
    } catch {
    }
  }, [storyId, startStory, navigation, refetchProgress]);

  const handleResume = useCallback(() => {
    navigation.navigate('StoryReader', {
      storyId,
      progressId: progress?.id,
    });
  }, [storyId, progress, navigation]);

  if (isLoading) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story" />}>
        <View style={styles.center}>
          <LoadingSpinner label="Loading story…" />
        </View>
      </AppShell>
    );
  }

  if (isError || !story) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story" />}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load story"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </AppShell>
    );
  }

  const status: LessonStatus = isCompleted ? 'completed' : isInProgress ? 'current' : 'available';

  const stats: Stat[] = [
    {
      value: `${story.estimatedDuration ?? 5} min`,
      label: 'Reading time',
      icon: 'clock',
      color: colors.primary,
    },
    {
      value: String(totalPages),
      label: totalPages === 1 ? 'Page' : 'Pages',
      icon: 'book',
      color: colors.blue,
    },
    {
      value: story.readingLevel ? `Level ${story.readingLevel}` : '—',
      label: 'Reading level',
      icon: 'chart',
      color: colors.purple,
    },
  ];

  return (
    <AppShell
      header={<PageHeader title={story.title} />}
      footer={
        <View style={styles.footer}>
          {isCompleted ? (
            <PrimaryButton
              label="Read Again"
              icon="replay"
              onPress={handleStartReading}
              loading={startStory.isPending}
            />
          ) : isInProgress ? (
            <>
              <PrimaryButton label="Resume Reading" icon="play" onPress={handleResume} />
              <SecondaryButton
                label="Start Over"
                icon="replay"
                onPress={handleStartReading}
                loading={startStory.isPending}
              />
            </>
          ) : (
            <PrimaryButton
              label="Start Reading"
              icon="play"
              onPress={handleStartReading}
              loading={startStory.isPending}
            />
          )}
        </View>
      }
    >
      {/* Identity */}
      <Card variant="raised" padding="roomy" accent={colors.primary} rail style={styles.card}>
        <View style={styles.headerRow}>
          <IconWell
            icon="book"
            color={colors.primary}
            soft={colors.primaryLight}
            size={cardSizes.iconWellLarge}
          />
          <View style={styles.headerInfo}>
            <Text style={[typography.presets.eyebrow, styles.eyebrow]} numberOfLines={1}>
              {humanize(story.category)}
            </Text>
            <Text style={[typography.presets.section, styles.title]}>{story.title}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge status={status} label={isInProgress && !isCompleted ? 'Reading' : undefined} />
        </View>
      </Card>

      {story.description ? (
        <Card variant="raised" padding="normal" style={styles.card}>
          <Text style={[typography.presets.cardTitle, styles.sectionTitle]}>What it's about</Text>
          <Text style={[typography.presets.body, styles.description]}>{story.description}</Text>
        </Card>
      ) : null}

      <Card variant="raised" padding="normal" style={styles.card}>
        <StatGrid stats={stats} />
      </Card>

      {progress ? (
        <Card variant="raised" padding="normal" style={styles.card}>
          <Text style={[typography.presets.cardTitle, styles.sectionTitle]}>Your progress</Text>
          <ProgressIndicator
            value={progress.completionPercent ?? 0}
            color={isCompleted ? colors.successDark : colors.primary}
            accessibilityLabel={`${story.title} is ${Math.round(progress.completionPercent ?? 0)} percent read`}
          />
          <Text style={[typography.presets.caption, styles.progressStats]}>
            {isCompleted
              ? `Finished in ${Math.round((progress.readingTime ?? 0) / 60)} min`
              : `Page ${(progress.currentPage ?? 0) + 1} of ${progress.totalPages ?? totalPages}`}
            {progress.starsEarned ? ` · ${progress.starsEarned} stars` : ''}
          </Text>
        </Card>
      ) : null}

      {vocabCount > 0 ? (
        <Card variant="raised" padding="normal" style={styles.card}>
          <View style={styles.vocabHeader}>
            <PetalIcon name="sparkle" size={18} color={colors.secondary} />
            <Text style={[typography.presets.cardTitle, styles.vocabTitle]}>New words</Text>
            <Text style={[typography.presets.caption, styles.muted]}>
              {vocabCount} {vocabCount === 1 ? 'word' : 'words'}
            </Text>
          </View>
          {story.vocabulary?.slice(0, 5).map((v: any, index: number) => (
            <View key={v.id} style={[styles.vocabItem, index > 0 && styles.vocabItemDivided]}>
              <Text style={[typography.presets.body, styles.vocabWord]}>{v.word}</Text>
              {v.definition ? (
                <Text style={[typography.presets.caption, styles.vocabDef]}>{v.definition}</Text>
              ) : null}
            </View>
          ))}
          {vocabCount > 5 ? (
            <Text style={[typography.presets.caption, styles.vocabMore]}>
              +{vocabCount - 5} more words in the story
            </Text>
          ) : null}
        </Card>
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
  card: {
    marginBottom: cardSizes.gap,
  },
  muted: {
    color: colors.textSecondary,
  },

  // ------------------------------------------------------------------ identity
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textSecondary,
  },
  title: {
    color: colors.text,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },

  sectionTitle: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 21,
  },
  progressStats: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // ---------------------------------------------------------------- vocabulary
  vocabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  vocabTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
  },
  vocabItem: {
    paddingVertical: spacing.sm,
  },
  vocabItemDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vocabWord: {
    color: colors.text,
    fontWeight: '700',
  },
  vocabDef: {
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 19,
  },
  vocabMore: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  footer: {
    gap: spacing.sm,
  },
});

export default StoryDetailScreen;
