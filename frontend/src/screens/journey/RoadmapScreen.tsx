import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { RoadmapCard } from '../../components/roadmap/RoadmapCard';
import { toUserMessage } from '../../api/errors';
import { useRoadmap } from '../../hooks/useLearningQueries';
import { useDeviceType } from '../../hooks/useDeviceType';
import type { ApiResponse } from '../../types/api';
import type { Category, Lesson } from '../../store/roadmapStore';
import { colors, spacing, typography, breakpoints } from '../../theme';

export const RoadmapScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();
  const { width: windowWidth } = useWindowDimensions();
  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useRoadmap();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const roadmapData = (rawData as ApiResponse<{ roadmap: Category[]; currentLesson: Lesson | null }> | undefined)?.data;
  const categories = roadmapData?.roadmap ?? [];
  const currentLesson = roadmapData?.currentLesson ?? null;

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleModulePress = useCallback(
    (moduleId: string) => {
      navigation.navigate('Module', { moduleId });
    },
    [navigation],
  );

  const handleLessonPress = useCallback(
    (lessonId: string) => {
      navigation.navigate('LessonOverview', { lessonId });
    },
    [navigation],
  );

  const isDesktop = deviceType === 'desktop' || windowWidth >= breakpoints.tabletMax;
  const contentMaxWidth = 640;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <SectionHeader title="Your Journey" subtitle="Loading your learning path..." />
          <View style={[styles.content, isDesktop && styles.contentDesktop]}>
            <View style={{ maxWidth: contentMaxWidth, width: '100%' }}>
              <RoadmapCard
                title=""
                modulesCount={0}
                lessonsCompleted={0}
                lessonsCount={0}
                stars={0}
                isCompleted={false}
                isUnlocked={false}
                isExpanded={false}
                onToggle={() => {}}
                loading
              />
              <RoadmapCard
                title=""
                modulesCount={0}
                lessonsCompleted={0}
                lessonsCount={0}
                stars={0}
                isCompleted={false}
                isUnlocked={false}
                isExpanded={false}
                onToggle={() => {}}
                loading
              />
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <SectionHeader title="Your Journey" />
          <View style={styles.center}>
            <ErrorState
              title="Couldn't load roadmap"
              message={toUserMessage(error)}
              onRetry={refetch}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (categories.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <SectionHeader title="Your Journey" />
          <View style={styles.center}>
            <EmptyState
              icon="🌱"
              title="No learning path yet"
              message="New lessons will appear here soon!"
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <SectionHeader
          title="Your Journey"
          subtitle={`${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`}
        />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.contentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.purple}
              colors={[colors.purple]}
            />
          }
        >
          <View style={{ maxWidth: contentMaxWidth, width: '100%' }}>
            {categories.map((category: Category) => {
              const modulesForCard = category.modules.map((mod) => ({
                id: mod.id,
                title: mod.title,
                lessonsCount: mod.lessons.length,
                isCompleted: mod.isCompleted,
                isUnlocked: mod.isUnlocked,
              }));

              return (
                <RoadmapCard
                  key={category.id}
                  title={category.title}
                  description={category.description}
                  modulesCount={category.modules.length}
                  lessonsCompleted={category.lessonsCompleted}
                  lessonsCount={category.lessonsCount}
                  stars={category.stars}
                  isCompleted={category.isCompleted}
                  isUnlocked={category.isUnlocked}
                  isExpanded={expandedCategories.has(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                  onModulePress={handleModulePress}
                  modules={modulesForCard}
                />
              );
            })}

            {currentLesson && (
              <View style={styles.currentLessonBanner}>
                <Text style={styles.currentLabel}>Current Lesson</Text>
                <Text style={styles.currentTitle}>{currentLesson.title}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentDesktop: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  currentLessonBanner: {
    backgroundColor: colors.primaryLight + '20',
    borderRadius: 16,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginTop: spacing.md,
  },
  currentLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    fontFamily: typography.families.rounded,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  currentTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
});
