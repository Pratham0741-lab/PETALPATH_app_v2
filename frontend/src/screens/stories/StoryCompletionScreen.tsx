import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatCard } from '../../components/ui';
import { useStory, useStoryProgress } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

type RouteParams = { storyId: string };

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
      <ScreenContainer>
        <TopBar title="Story Complete" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Loading results..." />
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !story) {
    return (
      <ScreenContainer>
        <TopBar title="Story Complete" showBack />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load results"
            message={toUserMessage(error)}
          />
        </View>
      </ScreenContainer>
    );
  }

  const starsEarned = progress?.starsEarned ?? 3;
  const vocabCount = story?.vocabulary?.length ?? 0;
  const readingTimeSec = progress?.readingTime ?? 0;
  const minutes = Math.floor(readingTimeSec / 60);
  const seconds = readingTimeSec % 60;

  const handleContinue = () => {
    navigation.navigate('Stories');
  };

  return (
    <ScreenContainer>
      <TopBar title="Story Complete" />
      <View style={styles.container}>
        <View style={styles.celebrationSection}>
          <View style={styles.starsRow}>
            {Array.from({ length: starsEarned }).map((_, i) => (
              <Ionicons key={i} name="star" size={40} color={colors.yellow} />
            ))}
          </View>
          <Text style={styles.congratsTitle}>Story Complete!</Text>
          <Text style={styles.congratsSubtitle}>
            Great job reading "{story.title}"
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Stars Earned"
            value={starsEarned}
            icon="star"
            iconColor={colors.yellow}
            style={styles.statCard}
          />
          <StatCard
            title="Words Learned"
            value={vocabCount}
            icon="bookmark"
            iconColor={colors.blue}
            style={styles.statCard}
          />
        </View>

        <AppCard style={styles.timeCard}>
          <View style={styles.timeCardContent}>
            <Ionicons name="time-outline" size={28} color={colors.purple} />
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Reading Time</Text>
              <Text style={styles.timeValue}>
                {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
              </Text>
            </View>
          </View>
        </AppCard>

        {vocabCount > 0 ? (
          <AppCard style={styles.vocabCard}>
            <Text style={styles.vocabTitle}>Vocabulary Learned</Text>
            <View style={styles.vocabTags}>
              {story.vocabulary?.map((v: any) => (
                <View key={v.id} style={styles.vocabTag}>
                  <Text style={styles.vocabTagText}>{v.word}</Text>
                </View>
              ))}
            </View>
          </AppCard>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            label="Back to Stories"
            onPress={handleContinue}
            variant="primary"
          />
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
  celebrationSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.xl,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  congratsTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  congratsSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
  },
  timeCard: {
    marginBottom: spacing.lg,
  },
  timeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  timeValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  vocabCard: {
    marginBottom: spacing.xl,
  },
  vocabTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  vocabTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  vocabTag: {
    backgroundColor: `${colors.blue}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vocabTagText: {
    fontSize: typography.sizes.sm,
    color: colors.blue,
    fontWeight: typography.weights.medium,
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
});

export default StoryCompletionScreen;
