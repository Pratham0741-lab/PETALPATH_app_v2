/**
 * Lesson Completed — reference screen 11 (spec §34 phase 6).
 *
 * The completion pipeline is untouched (§1). `completionStartedRef` still fires
 * `completeLessonBackend` exactly once per lesson id, `findLessonContext` still
 * walks categories → modules → lessons, `categoryBadgeMap` keeps the same four
 * entries and `handleFinish` still branches category → module → Home in that
 * order. Only the chrome is rebuilt:
 *
 *  - `ScreenContainer` becomes `AppShell`, so this screen gets the same warm
 *    background, petals and safe areas as every other one.
 *  - The 100px `Ionicons name="star"` circle becomes `IconWell`, the row of
 *    eight `Ionicons` becomes the shared `StarRating`, and the purple-tinted
 *    "Total Stars" chip becomes `RewardBadge kind="stars"` — purple is reserved
 *    for selection and progress (§3), and stars are yellow everywhere else in
 *    the app, so the chip was the odd one out.
 *  - The `sparkles` glyph standing in for the mentor becomes the child's actual
 *    buddy, drawn with `AvatarGlyph` (§7, §8).
 *  - The two `height: 50` / `height: 54` buttons become `SecondaryButton` and
 *    `PrimaryButton` in `AppShell`'s sticky footer, so "Continue" is reachable
 *    without scrolling on a short screen (§27).
 *  - `NavigationGuide` moves *outside* the shell. It positions itself
 *    absolutely, and inside a ScrollView that anchors it to the scrolled
 *    content rather than to the screen.
 *
 * The "8 stars" denominator is the shipped contract (three stars per activity
 * is not what the backend reports here), so it is carried across as-is rather
 * than invented anew.
 */

import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { colors, spacing, typography } from '../../theme';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useProgressStore } from '../../store/progressStore';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { useDeviceType } from '../../hooks/useDeviceType';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';
import {
  AppShell,
  AvatarGlyph,
  Card,
  PrimaryButton,
  RewardBadge,
  SecondaryButton,
  StarRating,
} from '../../components/design';
import { CelebrationScaffold } from './CelebrationScaffold';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { PetalMark } from '../../components/brand/PetalMark';

const categoryBadgeMap: Record<string, string> = {
  'Shapes': 'Shape Master',
  'Alphabet': 'Alphabet Explorer',
  'Numbers': 'Number Hero',
  'Reading Readiness': 'Reading Champion',
};

/** Stars a single lesson can award — the value the backend scores against. */
const STARS_PER_LESSON = 8;

const MENTOR_MESSAGE =
  'You worked so hard today! Watching the tutorial, listening, speaking, and drawing. You are an absolute superstar!';

export const LessonCompleteScreen: React.FC = () => {
  const { navigateToTab, navigateTo } = useAppNavigation();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;
  const { selectedLesson, completeLesson, loadCategories, categories } = useRoadmapStore();
  const completeLessonBackend = useProgressStore((state) => state.completeLesson);

  const isFocused = useIsFocused();
  const deviceType = useDeviceType();
  const isTablet = deviceType === 'tablet';

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
          if (__DEV__) console.error('Failed to complete lesson on backend:', err);
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
      navigateToTab('Home');
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
      navigateToTab('Home');
    }
  };

  if (loading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.celebrate} scroll={false} >
        <View style={styles.center}>
          <PetalMark size={96} loading />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Saving your progress…
          </Text>
        </View>
      </AppShell>
    );
  }

  const starsEarned = completionResult?.starsEarned ?? 0;
  const totalStars = completionResult?.totalStars ?? 0;
  const mentorFirstName = activeMentor.name.split(' ')[0];

  return (
    <CelebrationScaffold
      icon="star"
      iconColor={colors.yellow}
      iconSoft={colors.yellowSoft}
      title="Amazing!"
      message={`Outstanding job${activeChild?.name ? `, ${activeChild.name}` : ''}! You finished all the activities in “${selectedLesson?.title || 'this lesson'}”!`}
      footer={
        <View style={styles.footer}>
          <SecondaryButton
            label="View Rewards"
            icon="trophy"
            onPress={() => navigateToTab('Rewards')}
          />
          <PrimaryButton
            label="Continue"
            iconRight="forward"
            tone="green"
            onPress={handleFinish}
            accessibilityHint="Saves this lesson and goes back to your journey"
          />
        </View>
      }
      overlay={
        isTablet ? (
          <NavigationGuide
            screenKey="lesson_complete"
            guideKey="lesson_complete"
            message="Lesson completed! You did an amazing job!"
          />
        ) : null
      }
    >
      {/* Stars earned */}
      <Card variant="raised" padding="normal" accent={colors.yellow} style={styles.starsCard}>
        <StarRating value={starsEarned} max={STARS_PER_LESSON} size="md" animate />
        <Text style={[typography.presets.body, styles.starsText]}>
          You earned{' '}
          <Text style={styles.starsCount}>
            {starsEarned} / {STARS_PER_LESSON}
          </Text>{' '}
          stars in this lesson!
        </Text>
        <RewardBadge kind="stars" value={totalStars} showUnit size="md" />
      </Card>

      {/* Message from the child's learning buddy */}
      <Card variant="raised" padding="normal" accent={activeMentor.color} rail>
        <View style={styles.mentorRow}>
          <AvatarGlyph
            species={activeMentor.species}
            size={48}
            ringColor={activeMentor.color}
            accessibilityLabel={`${activeMentor.name}, your learning buddy`}
          />
          <View style={styles.mentorText}>
            <Text style={[typography.presets.eyebrow, { color: activeMentor.color }]}>
              Message from {mentorFirstName}
            </Text>
            <Text style={[typography.presets.subtle, styles.quote]}>“{MENTOR_MESSAGE}”</Text>
          </View>
        </View>
      </Card>
    </CelebrationScaffold>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  starsCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  starsText: {
    color: colors.text,
    textAlign: 'center',
  },
  starsCount: {
    fontWeight: typography.weights.black,
    color: colors.text,
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  mentorText: {
    /* `flexShrink` keeps a long quote from pushing the avatar off-screen. */
    flexShrink: 1,
    flexGrow: 1,
    gap: 3,
  },
  quote: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    gap: spacing.sm,
  },
});

export default LessonCompleteScreen;
