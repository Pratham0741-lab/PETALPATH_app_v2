import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { Badge, ProgressBar } from '../../components/ui';
import { useStory, useStoryProgress, useStartStory } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

type RouteParams = { storyId: string };

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
      <ScreenContainer>
        <TopBar title="Story" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Loading story..." />
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !story) {
    return (
      <ScreenContainer>
        <TopBar title="Story" showBack />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load story"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TopBar title="Story Detail" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverSection}>
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book" size={64} color={colors.purple} />
          </View>
          {isCompleted ? (
            <Badge label="Completed" color={colors.green} style={styles.completedBadge} />
          ) : null}
        </View>

        <Text style={styles.title}>{story.title}</Text>

        {story.description ? (
          <Text style={styles.description}>{story.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          {story.category ? (
            <Badge label={story.category} color={colors.blue} />
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>{story.estimatedDuration ?? 5} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>{totalPages} pages</Text>
          </View>
          {story.readingLevel ? (
            <View style={styles.metaItem}>
              <Ionicons name="trending-up" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>Level {story.readingLevel}</Text>
            </View>
          ) : null}
        </View>

        {progress ? (
          <AppCard style={styles.progressCard}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <ProgressBar
              progress={progress.completionPercent ?? 0}
              color={isCompleted ? colors.green : colors.purple}
              style={styles.progressBar}
            />
            <Text style={styles.progressStats}>
              {isCompleted
                ? `Completed in ${Math.round((progress.readingTime ?? 0) / 60)} min`
                : `Page ${(progress.currentPage ?? 0) + 1} of ${progress.totalPages ?? totalPages}`
              }
              {progress.starsEarned ? ` · ${progress.starsEarned} stars` : ''}
            </Text>
          </AppCard>
        ) : null}

        <AppCard style={styles.vocabCard}>
          <View style={styles.vocabHeader}>
            <Ionicons name="bookmark" size={20} color={colors.purple} />
            <Text style={styles.vocabTitle}>Vocabulary</Text>
            <Text style={styles.vocabCount}>{vocabCount} words</Text>
          </View>
          {story.vocabulary?.slice(0, 5).map((v: any) => (
            <View key={v.id} style={styles.vocabItem}>
              <Text style={styles.vocabWord}>{v.word}</Text>
              {v.definition ? (
                <Text style={styles.vocabDef}>{v.definition}</Text>
              ) : null}
            </View>
          ))}
          {vocabCount > 5 ? (
            <Text style={styles.vocabMore}>+{vocabCount - 5} more words</Text>
          ) : null}
        </AppCard>

        <View style={styles.actions}>
          {isCompleted ? (
            <AppButton
              label="Read Again"
              onPress={handleStartReading}
              variant="primary"
              loading={startStory.isPending}
            />
          ) : isInProgress ? (
            <>
              <AppButton
                label="Resume Reading"
                onPress={handleResume}
                variant="primary"
                style={styles.actionBtn}
              />
              <AppButton
                label="Start Over"
                onPress={handleStartReading}
                variant="secondary"
                loading={startStory.isPending}
                style={styles.actionBtn}
              />
            </>
          ) : (
            <AppButton
              label="Start Reading"
              onPress={handleStartReading}
              variant="primary"
              loading={startStory.isPending}
            />
          )}
        </View>
      </ScrollView>
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
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  coverSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  coverPlaceholder: {
    width: 160,
    height: 200,
    borderRadius: radius.illustrationCard,
    backgroundColor: `${colors.purple}10`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  completedBadge: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  progressCard: {
    marginBottom: spacing.lg,
  },
  progressTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressBar: {
    marginBottom: spacing.sm,
  },
  progressStats: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  vocabCard: {
    marginBottom: spacing.xl,
  },
  vocabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  vocabTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  vocabCount: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  vocabItem: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vocabWord: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  vocabDef: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  vocabMore: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});

export default StoryDetailScreen;
