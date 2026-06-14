import React, { useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { LessonNode } from '../../components/cards/LessonNode';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { ProgressBar } from '../../components/progress/ProgressBar';
import { spacing, colors, typography, radius } from '../../theme';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';

export const JourneyDesktop: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;
  const {
    selectedCategory,
    expandedCategory,
    categories,
    lessons,
    loading,
    error,
    loadCategories,
    selectCategory,
    selectLesson,
    isLessonUnlocked,
    completedLessons,
  } = useRoadmapStore();

  useEffect(() => {
    const initialize = async () => {
      if (categories.length === 0) {
        await loadCategories();
      }
      const state = useRoadmapStore.getState();
      const targetCatId = state.expandedCategory;
      const targetCat = targetCatId
        ? state.categories.find(c => c.id === targetCatId)
        : null;
      if (targetCat) {
        await selectCategory(targetCat);
      } else if (!state.selectedCategory && state.categories.length > 0) {
        await selectCategory(state.categories[0]);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const state = useRoadmapStore.getState();
      const targetCatId = state.expandedCategory;
      const targetCat = targetCatId
        ? state.categories.find(c => c.id === targetCatId)
        : state.selectedCategory
          ? state.categories.find(c => c.id === state.selectedCategory!.id)
          : state.categories[0] || null;
      if (targetCat) {
        selectCategory(targetCat);
      }

      loadCategories().then(() => {
        const freshState = useRoadmapStore.getState();
        const freshCatId = freshState.expandedCategory || freshState.selectedCategory?.id;
        const freshCat = freshCatId
          ? freshState.categories.find(c => c.id === freshCatId)
          : freshState.categories[0] || null;
        if (freshCat) {
          selectCategory(freshCat);
        }
      });
    });
    return unsubscribe;
  }, [navigation, loadCategories, selectCategory]);

  const handleLessonClick = async (lesson: any) => {
    if (isLessonUnlocked(lesson.id)) {
      await selectLesson(lesson);
      navigation.navigate('LessonOverview');
    }
  };

  // Compute category completion details
  const categoryLessons = lessons.map((l) => l.id);
  const completedInCategoryCount = categoryLessons.filter((id) =>
    completedLessons.includes(id)
  ).length;
  const progressRatio = lessons.length > 0 ? completedInCategoryCount / lessons.length : 0;

  return (
    <ScreenContainer>
      <View style={styles.layout}>
        {/* Left column: Lessons path */}
        {loading && lessons.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.mainContent}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <SectionHeader
                title={selectedCategory ? `${selectedCategory.title} Journey` : 'Journey'}
                subtitle="Complete lessons sequentially to trace more paths and shapes!"
              />
            </View>

            {lessons.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No lessons found.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {lessons.map((lesson) => {
                  const isLocked = !isLessonUnlocked(lesson.id);
                  const isCompleted = completedLessons.includes(lesson.id);
                  return (
                    <LessonNode
                      key={lesson.id}
                      lesson={lesson}
                      isLocked={isLocked}
                      isCompleted={isCompleted}
                      onPress={() => handleLessonClick(lesson)}
                    />
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* Right column: Progress stats and mentor avatar */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Current Progress</Text>

          <View style={styles.progressBox}>
            <Text style={styles.progressTitle}>Category Completed</Text>
            <Text style={styles.progressText}>
              {completedInCategoryCount} of {lessons.length} Lessons Completed
            </Text>
            <ProgressBar
              progress={progressRatio}
              height={10}
              color={colors.green}
              style={styles.progressBar}
            />
          </View>

          <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  sidebar: {
    width: 320,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  progressBox: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  progressBar: {
    marginTop: spacing.xs,
  },
  mentorCard: {
    marginTop: spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  errorText: {
    color: '#FF4A4A',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
