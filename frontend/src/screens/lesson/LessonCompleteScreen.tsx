import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card, Button } from '../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useIsFocused } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useProgressStore } from '../../store/progressStore';
import { Ionicons } from '@expo/vector-icons';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';

const categoryBadgeMap: Record<string, string> = {
  'Shapes': 'Shape Master',
  'Alphabet': 'Alphabet Explorer',
  'Numbers': 'Number Hero',
  'Reading Readiness': 'Reading Champion',
};

export const LessonCompleteScreen: React.FC = () => {
  const { navigateToTab, navigateTo, navigation } = useAppNavigation();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;
  const { selectedLesson, completeLesson, loadCategories, categories } = useRoadmapStore();
  const completeLessonBackend = useProgressStore((state) => state.completeLesson);

  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [completionResult, setCompletionResult] = useState<any>(null);
  const completionStartedRef = useRef<string | null>(null);

  useEffect(() => {
    const performCompletion = async () => {
      if (!isFocused) return;
      if (selectedLesson && completionStartedRef.current !== selectedLesson.id) {
        completionStartedRef.current = selectedLesson.id;
        try {
          const res = await completeLessonBackend(selectedLesson.id);
          setCompletionResult(res);
          completeLesson(selectedLesson.id);
          await loadCategories();
        } catch (err) {
          console.error('Failed to complete lesson on backend:', err);
        } finally {
          setLoading(false);
        }
      } else if (!selectedLesson) {
        setLoading(false);
      }
    };

    performCompletion();
  }, [selectedLesson, completeLessonBackend, completeLesson, loadCategories, isFocused]);

  const findLessonContext = (lessonId: string) => {
    for (const category of categories) {
      for (const module of category.modules) {
        const lessonIndex = module.lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex !== -1) {
          const nextModule = category.modules[category.modules.findIndex(m => m.id === module.id) + 1] || null;
          return {
            category,
            module,
            nextModule,
          };
        }
      }
    }
    return null;
  };

  const handleFinish = () => {
    if (!selectedLesson || !completionResult) {
      navigateToTab('Journey');
      return;
    }

    const context = findLessonContext(selectedLesson.id);

    if (completionResult.categoryCompleted && context?.category) {
      const badge = categoryBadgeMap[context.category.title] || 'Alphabet Explorer';
      navigateTo('CategoryComplete', {
        categoryTitle: context.category.title,
        badgeName: badge,
      });
    } else if (completionResult.moduleCompleted && context?.module) {
      navigateTo('ModuleComplete', {
        moduleTitle: context.module.title,
        nextModuleTitle: context.nextModule?.title || null,
      });
    } else {
      navigateToTab('Journey');
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={[styles.loadingText, { fontFamily: typography.families.rounded }]}>Saving your progress...</Text>
      </ScreenContainer>
    );
  }

  const starsEarned = completionResult?.starsEarned ?? 0;
  const totalStars = completionResult?.totalStars ?? 0;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        
        {/* Celebration Header */}
        <View style={styles.celebrationHeader}>
          <View style={styles.starCircle}>
            <Ionicons name="star" size={56} color={colors.yellow} />
          </View>
          <Text style={[styles.title, { fontFamily: typography.families.rounded }]}>Lesson Completed!</Text>
          <Text style={[styles.subtitle, { fontFamily: typography.families.rounded }]}>
            Outstanding job, {activeChild?.name}! You finished all the activities in "{selectedLesson?.title || 'this lesson'}"!
          </Text>
        </View>

        {/* Stars Earned Card */}
        <Card style={styles.starsCard}>
          <View style={styles.starsRow}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Ionicons
                key={i}
                name="star"
                size={24}
                color={i < starsEarned ? colors.yellow : colors.border}
                style={styles.starIcon}
              />
            ))}
          </View>
          <Text style={[styles.starsText, { fontFamily: typography.families.rounded }]}>
            You earned <Text style={styles.boldText}>{starsEarned} / 8</Text> stars in this lesson!
          </Text>
          <View style={styles.totalStarsContainer}>
            <Ionicons name="trophy" size={16} color={colors.purple} />
            <Text style={[styles.totalStarsText, { fontFamily: typography.families.rounded }]}>
              Total Stars: <Text style={styles.boldText}>{totalStars}</Text>
            </Text>
          </View>
        </Card>

        {/* Success Card with Mentor feedback */}
        <Card style={styles.nextCard}>
          <View style={styles.mentorRow}>
            <View style={styles.mentorIcon}>
              <Ionicons name="sparkles" size={20} color={colors.yellow} />
            </View>
            <View style={styles.mentorInfo}>
              <Text style={[styles.mentorTalkTitle, { fontFamily: typography.families.rounded }]}>Message from {activeMentor.name.split(' ')[0]}</Text>
              <Text style={[styles.mentorText, { fontFamily: typography.families.rounded }]}>
                "You worked so hard today! Watching the tutorial, listening, speaking, and drawing. You are an absolute superstar!"
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            label="View Rewards"
            variant="secondary"
            onPress={() => navigateToTab('Rewards')}
            style={styles.rewardsBtn}
          />
          <Button
            label="Continue"
            variant="primary"
            onPress={handleFinish}
            style={styles.doneBtn}
          />
        </View>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  loadingContainer: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  celebrationHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  starCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(247, 201, 75, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(247, 201, 75, 0.3)',
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  starsCard: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  starIcon: {
    marginHorizontal: 1,
  },
  starsText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
  },
  boldText: {
    fontWeight: typography.weights.bold,
  },
  totalStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(139, 120, 216, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 120, 216, 0.2)',
  },
  totalStarsText: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: 'bold',
  },
  nextCard: {
    width: '100%',
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  mentorIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(247, 201, 75, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(247, 201, 75, 0.25)',
  },
  mentorInfo: {
    flex: 1,
    gap: 2,
  },
  mentorTalkTitle: {
    color: colors.purple,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  mentorText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rewardsBtn: {
    width: '100%',
    height: 50,
  },
  doneBtn: {
    width: '100%',
    height: 54,
  },
});
export default LessonCompleteScreen;
