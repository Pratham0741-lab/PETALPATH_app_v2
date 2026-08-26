import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/common/ErrorState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { activityApi } from '../../services/api/activityApi';
import { useCompleteReading } from '../../hooks/useActivityProgress';
import { useActivitySync } from '../../hooks/useActivitySync';
import { toUserMessage } from '../../api/errors';
import type { ReadingContent } from '../../components/activities/types';
import type { ApiResponse } from '../../types/api';
import { colors, spacing, typography, radius, shadows } from '../../theme';

type ReadingRouteParams = {
  Reading: { activityId: string };
};

function highlightBody(
  body: string,
  vocabulary: ReadingContent['vocabulary'],
  onWordTap: (word: string, definition: string) => void,
): React.ReactNode[] {
  const words = vocabulary.map((v) => v.word.toLowerCase());
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  const parts = body.split(/(\s+)/);
  const children: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    const match = regex.exec(part);
    regex.lastIndex = 0;

    if (match) {
      const matchedWord = match[0];
      const vocabEntry = vocabulary.find(
        (v) => v.word.toLowerCase() === matchedWord.toLowerCase(),
      );
      if (vocabEntry) {
        children.push(
          <Text
            key={`vocab-${index}`}
            onPress={() => onWordTap(matchedWord, vocabEntry.definition)}
            accessibilityRole="button"
            accessibilityLabel={`${matchedWord}: ${vocabEntry.definition}`}
            style={styles.vocabChip}
          >
            <Text style={styles.vocabText}>{matchedWord}</Text>
          </Text>,
        );
        return;
      }
    }
    children.push(<Text key={`text-${index}`}>{part}</Text>);
  });

  return children;
}

export const ReadingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ReadingRouteParams, 'Reading'>>();
  const { activityId } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const { syncAfterActivity } = useActivitySync();
  const completeReadingMutation = useCompleteReading();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [tooltipWord, setTooltipWord] = useState<{ word: string; definition: string } | null>(null);

  const {
    data: rawResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reading-content', activityId],
    queryFn: () => activityApi.getReadingContent(activityId),
  });

  const content = (rawResponse as ApiResponse<ReadingContent> | undefined)?.data ?? null;

  const handleWordTap = useCallback((word: string, definition: string) => {
    setTooltipWord({ word, definition });
  }, []);

  const handleDismissTooltip = useCallback(() => {
    setTooltipWord(null);
  }, []);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const scrollableHeight = contentSize.height - layoutMeasurement.height;
      if (scrollableHeight <= 0) {
        setScrollProgress(100);
        return;
      }
      const progress = Math.min(100, Math.round((contentOffset.y / scrollableHeight) * 100));
      setScrollProgress(progress);
    },
    [],
  );

  const handleMarkAsRead = useCallback(() => {
    completeReadingMutation.mutate(activityId, {
      onSuccess: () => {
        syncAfterActivity();
        navigation.goBack();
      },
    });
  }, [activityId, completeReadingMutation, syncAfterActivity, navigation]);

  const bodyElements = useMemo(() => {
    if (!content) return [];
    return highlightBody(content.body, content.vocabulary, handleWordTap);
  }, [content, handleWordTap]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Skeleton variant="rect" width="100%" height={6} borderRadius={3} style={styles.skelProgress} />
          <View style={styles.skelHeader}>
            <Skeleton variant="text" width="75%" height={28} />
            <Skeleton variant="text" width={100} height={20} style={styles.skelMarginSm} />
          </View>
          <Skeleton variant="rect" width="100%" height={200} borderRadius={radius.card} style={styles.skelMarginMd} />
          <Skeleton variant="text" width="100%" height={14} style={styles.skelMarginSm} />
          <Skeleton variant="text" width="100%" height={14} style={styles.skelMarginSm} />
          <Skeleton variant="text" width="90%" height={14} style={styles.skelMarginSm} />
          <Skeleton variant="text" width="85%" height={14} style={styles.skelMarginSm} />
          <Skeleton variant="text" width="100%" height={14} style={styles.skelMarginSm} />
          <Skeleton variant="text" width="70%" height={14} style={styles.skelMarginSm} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load reading"
            message={toUserMessage(error)}
            onRetry={() => refetch()}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!content) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Reading not found"
            message="This reading activity doesn't exist or has been removed."
            onRetry={() => refetch()}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.progressBarContainer}>
        <ProgressBar
          progress={scrollProgress}
          height={6}
          variant="primary"
          animated
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        accessibilityLabel="Reading content"
      >
        <View style={styles.contentInner}>
          <Text style={styles.title}>{content.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.readingTime}>
              {content.estimatedReadingTime} min read
            </Text>
          </View>

          {content.imageUrl ? (
            <Card variant="flat" padding="none" style={styles.imageCard}>
              <Image
                source={{ uri: content.imageUrl }}
                style={styles.image}
                resizeMode="cover"
                accessibilityRole="image"
                accessibilityLabel={content.title}
              />
            </Card>
          ) : null}

          <View style={styles.bodySection}>
            <Text style={styles.bodyText}>{bodyElements}</Text>
          </View>

          {content.vocabulary.length > 0 ? (
            <View style={styles.vocabSection}>
              <Text style={styles.vocabSectionTitle}>
                <Ionicons name="book" size={16} color={colors.primary} /> Vocabulary
              </Text>
              <View style={styles.vocabList}>
                {content.vocabulary.map((v, i) => (
                  <TouchableOpacity
                    key={`vocab-def-${i}`}
                    onPress={() => handleWordTap(v.word, v.definition)}
                    accessibilityRole="button"
                    accessibilityLabel={`${v.word}: ${v.definition}`}
                    activeOpacity={0.7}
                    style={styles.vocabDefItem}
                  >
                    <Text style={styles.vocabDefWord}>{v.word}</Text>
                    <Text style={styles.vocabDefDivider}>—</Text>
                    <Text style={styles.vocabDefText}>{v.definition}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.completeSection}>
            <Button
              label="Mark as Read"
              variant="primary"
              onPress={handleMarkAsRead}
              loading={completeReadingMutation.isPending}
              disabled={completeReadingMutation.isPending}
              fullWidth
              size="lg"
              leftIcon={
                <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
              }
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={tooltipWord !== null}
        transparent
        animationType="fade"
        onRequestClose={handleDismissTooltip}
      >
        <Pressable style={styles.tooltipOverlay} onPress={handleDismissTooltip}>
          <Pressable
            style={styles.tooltipCard}
            onPress={() => {}}
          >
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipWord}>{tooltipWord?.word}</Text>
              <TouchableOpacity
                onPress={handleDismissTooltip}
                accessibilityRole="button"
                accessibilityLabel="Close definition"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.tooltipDefinition}>{tooltipWord?.definition}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  skelProgress: {
    marginBottom: spacing.md,
  },
  skelHeader: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  skelMarginSm: {
    marginTop: spacing.sm,
  },
  skelMarginMd: {
    marginBottom: spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  progressBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  contentInner: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  readingTime: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  imageCard: {
    marginBottom: spacing.lg,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  bodySection: {
    marginBottom: spacing.xl,
  },
  bodyText: {
    fontSize: typography.sizes.body,
    color: colors.text,
    fontFamily: typography.families.rounded,
    lineHeight: typography.lineHeights.xl,
  },
  vocabChip: {
    backgroundColor: colors.primaryLight + '30',
    borderRadius: radius.chip,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  vocabText: {
    fontSize: typography.sizes.body,
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  vocabSection: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vocabSectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.md,
  },
  vocabList: {
    gap: spacing.md,
  },
  vocabDefItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  vocabDefWord: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
    fontFamily: typography.families.rounded,
    minWidth: 80,
  },
  vocabDefDivider: {
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
  vocabDefText: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    flex: 1,
    lineHeight: typography.lineHeights.md,
  },
  completeSection: {
    marginTop: spacing.md,
  },
  tooltipOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    padding: spacing.xl,
  },
  tooltipCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    maxWidth: 360,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tooltipWord: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
    /* Shares a row with the close button; a long word would otherwise push the
       button off the tooltip rather than wrapping. */
    flexShrink: 1,
  },
  tooltipDefinition: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    lineHeight: typography.lineHeights.lg,
  },
});
