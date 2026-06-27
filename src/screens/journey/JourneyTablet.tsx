import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader, SearchBar, Chip, Card, ProgressBar } from '../../components/ui';
import { LessonNode } from '../../components/cards/LessonNode';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { spacing, colors, typography, radius, shadows } from '../../theme';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';

export const JourneyTablet: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;
  const [searchQuery, setSearchQuery] = useState('');

  const {
    selectedCategory,
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

  const selectSubjectCategory = (subjectName: string) => {
    let foundCat = null;
    const nameLower = subjectName.toLowerCase();
    if (nameLower.includes('story') || nameLower.includes('language')) {
      foundCat = categories.find(c => c.title.toLowerCase().includes('word') || c.title.toLowerCase().includes('letter') || c.title.toLowerCase().includes('alpha'));
    } else if (nameLower.includes('math')) {
      foundCat = categories.find(c => c.title.toLowerCase().includes('num'));
    } else if (nameLower.includes('art')) {
      foundCat = categories.find(c => c.title.toLowerCase().includes('shape') || c.title.toLowerCase().includes('color'));
    } else {
      foundCat = categories.find(c => c.title.toLowerCase().includes('prewriting'));
    }
    if (foundCat) {
      selectCategory(foundCat);
    }
  };

  const getActiveSubject = () => {
    if (!selectedCategory) return 'stories';
    const title = selectedCategory.title.toLowerCase();
    if (title.includes('word') || title.includes('letter') || title.includes('alpha')) return 'stories';
    if (title.includes('num')) return 'math';
    if (title.includes('shape') || title.includes('color')) return 'art';
    return 'skills';
  };

  const activeSubject = getActiveSubject();

  // Filter lessons
  const filteredLessons = searchQuery
    ? lessons.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase())))
    : lessons;

  const completedInCategoryCount = lessons.filter((l) => completedLessons.includes(l.id)).length;
  const progressPercent = lessons.length > 0 ? (completedInCategoryCount / lessons.length) * 100 : 0;

  return (
    <ScreenContainer>
      <View style={styles.layout}>
        {/* Left Column: Explorer Path */}
        <View style={styles.mainContent}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.searchSection}>
              <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search topics, paths..." />
            </View>

            <View style={styles.chipsSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                <Chip label="Stories 📖" active={activeSubject === 'stories'} onPress={() => selectSubjectCategory('stories')} />
                <Chip label="Math 🔢" active={activeSubject === 'math'} onPress={() => selectSubjectCategory('math')} />
                <Chip label="Art 🎨" active={activeSubject === 'art'} onPress={() => selectSubjectCategory('art')} />
                <Chip label="Skills 💡" active={activeSubject === 'skills'} onPress={() => selectSubjectCategory('skills')} />
              </ScrollView>
            </View>

            <View style={styles.pathSection}>
              <SectionHeader
                title={selectedCategory ? `${selectedCategory.title} Explore` : 'Explore path'}
                subtitle="sequential progress roadmap path"
              />

              {loading && lessons.length === 0 ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={colors.purple} />
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : filteredLessons.length === 0 ? (
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No lessons found.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {filteredLessons.map((lesson) => {
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
            </View>
          </ScrollView>
        </View>

        {/* Right column: Progress stats and mentor avatar */}
        <View style={styles.sidebar}>
          <Text style={[styles.sidebarTitle, { fontFamily: typography.families.rounded }]}>Explore Stats</Text>

          <Card style={styles.progressBox}>
            <Text style={[styles.progressTitle, { fontFamily: typography.families.rounded }]}>Path Completion</Text>
            <Text style={[styles.progressText, { fontFamily: typography.families.rounded }]}>
              {completedInCategoryCount} of {lessons.length} levels completed
            </Text>
            <ProgressBar progress={progressPercent} color={colors.green} />
          </Card>

          <View style={styles.buddySection}>
            <Text style={[styles.buddyTitle, { fontFamily: typography.families.rounded }]}>Your Buddy</Text>
            <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1.2,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  chipsSection: {
    marginTop: spacing.md,
  },
  chipsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  pathSection: {
    marginTop: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  sidebar: {
    flex: 0.8,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sidebarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
  },
  progressBox: {
    padding: spacing.md,
  },
  progressTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  buddySection: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  buddyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  mentorCard: {
    marginTop: spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.coral,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
export default JourneyTablet;
