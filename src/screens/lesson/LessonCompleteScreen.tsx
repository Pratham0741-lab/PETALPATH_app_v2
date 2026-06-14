import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Animated } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { colors, typography, spacing, radius } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useProgressStore } from '../../store/progressStore';
import { Ionicons } from '@expo/vector-icons';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

const categoryBadgeMap: Record<string, string> = {
  'Shapes': 'Shape Master',
  'Alphabet': 'Alphabet Explorer',
  'Numbers': 'Number Hero',
  'Reading Readiness': 'Reading Champion',
};

export const LessonCompleteScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;
  const { selectedLesson, completeLesson, loadCategories, categories } = useRoadmapStore();
  const completeLessonBackend = useProgressStore((state) => state.completeLesson);

  const [loading, setLoading] = useState(true);
  const [completionResult, setCompletionResult] = useState<any>(null);

  useEffect(() => {
    const performCompletion = async () => {
      if (selectedLesson) {
        try {
          const res = await completeLessonBackend(selectedLesson.id);
          setCompletionResult(res);
          // Sync roadmapStore state
          completeLesson(selectedLesson.id);
          await loadCategories();
        } catch (err) {
          console.error('Failed to complete lesson on backend:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    performCompletion();
  }, [selectedLesson]);

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
      navigation.navigate('MainTabs', { screen: 'Journey' });
      return;
    }

    const context = findLessonContext(selectedLesson.id);

    if (completionResult.categoryCompleted && context?.category) {
      const badge = categoryBadgeMap[context.category.title] || 'Alphabet Explorer';
      navigation.navigate('CategoryComplete', {
        categoryTitle: context.category.title,
        badgeName: badge,
      });
    } else if (completionResult.moduleCompleted && context?.module) {
      navigation.navigate('ModuleComplete', {
        moduleTitle: context.module.title,
        nextModuleTitle: context.nextModule?.title || null,
      });
    } else {
      navigation.navigate('MainTabs', { screen: 'Journey' });
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={styles.loadingText}>Saving your progress...</Text>
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
            <Ionicons name="star" size={64} color={colors.yellow} />
          </View>
          <Text style={styles.title}>Lesson Completed!</Text>
          <Text style={styles.subtitle}>
            Outstanding job, {activeChild?.name}! You finished all the activities in "{selectedLesson?.title || 'this lesson'}"!
          </Text>
        </View>

        {/* Stars Earned Card */}
        <AppCard style={styles.starsCard}>
          <View style={styles.starsRow}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Ionicons
                key={i}
                name="star"
                size={28}
                color={i < starsEarned ? colors.yellow : colors.border}
                style={styles.starIcon}
              />
            ))}
          </View>
          <Text style={styles.starsText}>
            You earned <Text style={styles.boldText}>{starsEarned} / 8</Text> stars in this lesson!
          </Text>
          <View style={styles.totalStarsContainer}>
            <Ionicons name="trophy" size={20} color={colors.purple} />
            <Text style={styles.totalStarsText}>
              Total Stars: <Text style={styles.boldText}>{totalStars}</Text>
            </Text>
          </View>
        </AppCard>

        {/* Success Card with Mentor feedback */}
        <AppCard style={styles.nextCard}>
          <View style={styles.mentorRow}>
            <View style={styles.mentorIcon}>
              <Ionicons name="sparkles" size={24} color={colors.yellow} />
            </View>
            <View style={styles.mentorInfo}>
              <Text style={styles.mentorTalkTitle}>Message from {activeMentor.name.split(' ')[0]}</Text>
              <Text style={styles.mentorText}>
                "You worked so hard today! Watching the tutorial, listening, speaking, and drawing. You are an absolute superstar!"
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <AppButton
            label="View Rewards"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Rewards' })}
            style={styles.rewardsBtn}
            variant="secondary"
          />
          <AppButton
            label="Continue"
            onPress={handleFinish}
            style={styles.doneBtn}
          />
        </View>
      </View>
      <NavigationGuide
        screenKey="lesson_complete"
        guideKey="lesson_complete"
        message="You did it! Amazing job!"
        showBubble={true}
      />
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
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  celebrationHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  starCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.yellow + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.yellow + '30',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  starsCard: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
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
    marginHorizontal: 2,
  },
  starsText: {
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  boldText: {
    fontWeight: typography.weights.bold,
  },
  totalStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.purple + '10',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  totalStarsText: {
    color: colors.purple,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  nextCard: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  mentorIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.yellow + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  mentorInfo: {
    flex: 1,
    gap: 4,
  },
  mentorTalkTitle: {
    color: colors.purple,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  mentorText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rewardsBtn: {
    width: '100%',
    height: 50,
    borderRadius: radius.xl,
  },
  doneBtn: {
    width: '100%',
    height: 54,
    borderRadius: radius.xl,
  },
});

export default LessonCompleteScreen;
