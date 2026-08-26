import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import {
  AppShell,
  Card,
  PageHeader,
  PrimaryButton,
  Stat,
  StatGrid,
  StarRating,
} from '../../components/design';
import { CelebrationScaffold } from '../lesson/CelebrationScaffold';
import { useStory, useStoryProgress } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Story Completion (spec §28, §35) — the "you finished it" moment for a story.
 *
 * Rebuilt on `CelebrationScaffold`, the same scaffold behind lesson, module and
 * category completion, so all four celebrations read as one moment rather than
 * four different screens. That also replaces the hand-rolled row of N raw
 * Ionicons stars with `StarRating`, which shows unearned stars as outlines and
 * speaks the score as one phrase instead of three anonymous images (§7, §30).
 *
 * The stats are told once each now: the star row already says how many stars
 * were earned, so the "Stars Earned" tile it sat directly above is gone and the
 * grid carries reading time and new words — the two figures that were not
 * already on screen.
 *
 * Data is unchanged: `useStory` + `useStoryProgress`, the same merged loading and
 * error states, the same `starsEarned ?? 3` fallback, and Continue still calls
 * `navigate('Stories')`.
 */

type RouteParams = { storyId: string };

/** Stars are out of three unless the API awards more — never clamp a real score. */
const STARS_PER_STORY = 3;

export const StoryCompletionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { storyId } = route.params;

  const { data: storyRes, isLoading: storyLoading, isError: storyError, error: storyErr } = useStory(storyId);
  const { data: progressRes, isLoading: progressLoading, isError: progressError, error: progressErr } = useStoryProgress(storyId);

  const story = storyRes?.data;
  const progress = progressRes?.data;

  const isLoading = storyLoading || progressLoading;
  const isError = storyError || progressError;
  const error = storyErr || progressErr;

  if (isLoading) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story Complete" />}>
        <View style={styles.center}>
          <LoadingSpinner label="Loading results…" />
        </View>
      </AppShell>
    );
  }

  if (isError || !story) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Story Complete" />}>
        <View style={styles.center}>
          <ErrorState title="Couldn't load results" message={toUserMessage(error)} />
        </View>
      </AppShell>
    );
  }

  const starsEarned = progress?.starsEarned ?? 3;
  const maxStars = Math.max(STARS_PER_STORY, starsEarned);
  const vocabCount = story?.vocabulary?.length ?? 0;
  const readingTimeSec = progress?.readingTime ?? 0;
  const minutes = Math.floor(readingTimeSec / 60);
  const seconds = readingTimeSec % 60;
  const readingTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const handleContinue = () => {
    navigation.navigate('Stories');
  };

  const stats: Stat[] = [
    { value: readingTime, label: 'Reading time', icon: 'clock', color: colors.primary },
    { value: String(vocabCount), label: vocabCount === 1 ? 'New word' : 'New words', icon: 'sparkle', color: colors.blue },
  ];

  return (
    <CelebrationScaffold
      icon="book"
      iconColor={colors.primary}
      iconSoft={colors.primaryLight}
      title="The end!"
      message={`Great job reading “${story.title}”!`}
      footer={
        <PrimaryButton
          label="Back to Stories"
          iconRight="forward"
          onPress={handleContinue}
          accessibilityHint="Goes back to the story library"
        />
      }
    >
      {/* Stars earned */}
      <Card variant="raised" padding="normal" accent={colors.yellow} style={styles.starsCard}>
        <StarRating value={starsEarned} max={maxStars} size="md" animate />
        <Text style={[typography.presets.body, styles.starsText]}>
          You earned{' '}
          <Text style={styles.starsCount}>
            {starsEarned} / {maxStars}
          </Text>{' '}
          stars for this story!
        </Text>
      </Card>

      <Card variant="raised" padding="normal" style={styles.card}>
        <StatGrid stats={stats} />
      </Card>

      {vocabCount > 0 ? (
        <Card variant="raised" padding="normal" style={styles.card}>
          <Text style={[typography.presets.cardTitle, styles.vocabTitle]}>Words you met</Text>
          <View style={styles.vocabTags} accessible accessibilityLabel={`Words you met: ${story.vocabulary?.map((v: any) => v.word).join(', ')}`}>
            {story.vocabulary?.map((v: any) => (
              <View key={v.id} style={styles.vocabTag}>
                <Text style={[typography.presets.caption, styles.vocabTagText]}>{v.word}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </CelebrationScaffold>
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
    marginBottom: spacing.md,
  },

  // -------------------------------------------------------------------- stars
  starsCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  starsText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  starsCount: {
    color: colors.text,
    fontWeight: '800',
  },

  // --------------------------------------------------------------- vocabulary
  vocabTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  vocabTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  vocabTag: {
    backgroundColor: colors.blueSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    /* Chips wrap, but a single long word would still stretch its chip past the
       card; letting the chip shrink keeps it inside. */
    flexShrink: 1,
  },
  vocabTagText: {
    // Near-black on the soft blue rather than blue-on-blue, which failed contrast.
    color: colors.text,
    fontWeight: '700',
  },
});

export default StoryCompletionScreen;
