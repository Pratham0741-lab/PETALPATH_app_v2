import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader } from '../../components/common/SectionHeader';
import { LessonNode } from '../../components/cards/LessonNode';
import { spacing, colors } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';

export const JourneyMobile: React.FC = () => {
  const navigation = useNavigation<any>();
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
      // Sync with the category the user expanded on the Roadmap/Home screen
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
      // 1. Instant UI update: sync category from current store data (no network wait)
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

      // 2. Background refresh: fetch latest data from server, then re-sync
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

  return (
    <ScreenContainer>
      <TopBar
        title={selectedCategory ? `${selectedCategory.title} Journey` : 'Journey'}
        showBack={true}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <SectionHeader
            title="Lessons Path"
            subtitle="Unlock each level sequentially by completing the previous lesson!"
          />
        </View>

        {loading && lessons.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : lessons.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No lessons found for this category.</Text>
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
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
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
    fontSize: 15,
    textAlign: 'center',
  },
});
