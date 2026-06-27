import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader, SearchBar, Chip, Card } from '../../components/ui';
import { LessonNode } from '../../components/cards/LessonNode';
import { spacing, colors, typography, radius, shadows } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore, Category } from '../../store/roadmapStore';
import { Ionicons } from '@expo/vector-icons';

export const JourneyMobile: React.FC = () => {
  const navigation = useNavigation<any>();
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

  // Filter lessons by search query
  const filteredLessons = searchQuery
    ? lessons.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase())))
    : lessons;

  return (
    <ScreenContainer>
      <TopBar title="Explore" showBack={false} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search lessons, topics, stories..."
          />
        </View>

        {/* Subject Chips */}
        <View style={styles.chipsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            <Chip label="Stories 📖" active={activeSubject === 'stories'} onPress={() => selectSubjectCategory('stories')} />
            <Chip label="Math 🔢" active={activeSubject === 'math'} onPress={() => selectSubjectCategory('math')} />
            <Chip label="Art 🎨" active={activeSubject === 'art'} onPress={() => selectSubjectCategory('art')} />
            <Chip label="Skills 💡" active={activeSubject === 'skills'} onPress={() => selectSubjectCategory('skills')} />
          </ScrollView>
        </View>

        {/* Carousel of recommended topics */}
        <View style={styles.carouselSection}>
          <SectionHeader title="Recommended for You" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScroll}>
            <Card style={[styles.carouselCard, { backgroundColor: '#FFF5F5' }]}>
              <Text style={styles.carouselEmoji}>🦖</Text>
              <Text style={[styles.carouselTitle, { fontFamily: typography.families.rounded }]}>Counting Dinosaurs</Text>
              <Text style={[styles.carouselLabel, { fontFamily: typography.families.rounded }]}>Math • Playful</Text>
            </Card>
            <Card style={[styles.carouselCard, { backgroundColor: '#F0F9FF' }]}>
              <Text style={styles.carouselEmoji}>🎨</Text>
              <Text style={[styles.carouselTitle, { fontFamily: typography.families.rounded }]}>Shapes Coloring</Text>
              <Text style={[styles.carouselLabel, { fontFamily: typography.families.rounded }]}>Art • Creative</Text>
            </Card>
            <Card style={[styles.carouselCard, { backgroundColor: '#FFFDF5' }]}>
              <Text style={styles.carouselEmoji}>🦊</Text>
              <Text style={[styles.carouselTitle, { fontFamily: typography.families.rounded }]}>Forest Story Time</Text>
              <Text style={[styles.carouselLabel, { fontFamily: typography.families.rounded }]}>Language • Stories</Text>
            </Card>
          </ScrollView>
        </View>

        {/* Lessons path listing */}
        <View style={styles.pathSection}>
          <SectionHeader
            title={selectedCategory ? `${selectedCategory.title} Path` : 'Lessons Path'}
            subtitle="Follow the cozy map to complete the levels!"
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
              <Text style={[styles.emptyText, { fontFamily: typography.families.rounded }]}>No lessons matching search.</Text>
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
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 100,
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
  carouselSection: {
    marginTop: spacing.lg,
  },
  carouselScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  carouselCard: {
    width: 170,
    height: 180,
    borderRadius: radius.illustrationCard,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  carouselEmoji: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  carouselTitle: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  carouselLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pathSection: {
    marginTop: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
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
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
export default JourneyMobile;
