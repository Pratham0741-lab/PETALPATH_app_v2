import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LessonNode } from '../../components/roadmap/LessonNode';
import { useRoadmap } from '../../hooks/useLearningQueries';
import { toUserMessage } from '../../api/errors';
import type { ApiResponse } from '../../types/api';
import type { Category, Module, Lesson } from '../../store/roadmapStore';
import { colors, spacing, typography, radius, iconSizes } from '../../theme';

type ModuleRouteParams = {
  Module: { moduleId: string };
};

export const ModuleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ModuleRouteParams, 'Module'>>();
  const { moduleId } = route.params;

  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useRoadmap();

  const roadmapData = (rawData as ApiResponse<{ roadmap: Category[] }> | undefined)?.data;
  const categories: Category[] = roadmapData?.roadmap ?? [];

  const allModules = categories.flatMap((c: Category) => c.modules);
  const module = allModules.find((m: Module) => m.id === moduleId) ?? null;

  const category = categories.find((c: Category) =>
    c.modules.some((m: Module) => m.id === moduleId),
  ) ?? null;

  const handleLessonPress = useCallback(
    (lessonId: string) => {
      navigation.navigate('LessonOverview', { lessonId });
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <ScreenContainer>
        <TopBar title="Module" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Loading module..." />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <TopBar title="Module" showBack />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load module"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!module) {
    return (
      <ScreenContainer>
        <TopBar title="Module" showBack />
        <View style={styles.center}>
          <EmptyState
            icon="🔍"
            title="Module not found"
            message="This module doesn't exist or has been removed."
          />
        </View>
      </ScreenContainer>
    );
  }

  const completedCount = module.lessons.filter((l: Lesson) => l.isCompleted).length;
  const unlockedCount = module.lessons.filter((l: Lesson) => l.isUnlocked).length;

  return (
    <ScreenContainer>
      <TopBar title={module.title} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.purple}
          />
        }
      >
        {category && (
          <View style={styles.breadcrumb}>
            <Ionicons name="folder" size={14} color={colors.textSecondary} />
            <Text style={styles.breadcrumbText}>{category.title}</Text>
          </View>
        )}

        <Text style={styles.title}>{module.title}</Text>

        {module.description ? (
          <Text style={styles.description}>{module.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {completedCount}/{module.lessons.length}
            </Text>
            <Text style={styles.statLabel}>Lessons Done</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{unlockedCount}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{module.lessons.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={iconSizes.sm} color={colors.text} />
          <Text style={styles.sectionTitle}>Lessons</Text>
        </View>

        {module.lessons.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No lessons yet"
            message="Lessons will appear here when they're ready."
          />
        ) : (
          <View style={styles.lessonList}>
            {module.lessons.map((lesson: Lesson) => (
              <LessonNode
                key={lesson.id}
                id={lesson.id}
                title={lesson.title}
                difficulty={lesson.difficulty}
                isCompleted={lesson.isCompleted}
                isUnlocked={lesson.isUnlocked}
                isCurrent={false}
                onPress={() => handleLessonPress(lesson.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  breadcrumbText: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    lineHeight: typography.lineHeights.md,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  statLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  lessonList: {
    gap: spacing.md,
  },
});
