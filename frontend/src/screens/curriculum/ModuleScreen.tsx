import React, { useCallback, useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useRoadmap } from '../../hooks/useLearningQueries';
import { toUserMessage } from '../../api/errors';
import type { ApiResponse } from '../../types/api';
import type { Category, Module, Lesson } from '../../store/roadmapStore';
import { colors, spacing, typography, cardSizes } from '../../theme';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import {
  AppShell,
  Card,
  LessonCard,
  LessonStatus,
  PageHeader,
  PetalIcon,
  ProgressIndicator,
  Stat,
  StatGrid,
} from '../../components/design';

/**
 * Module detail — the lessons inside one module.
 *
 * Behaviour is unchanged: `useRoadmap()` is still the only data source, the
 * module and its category are still found by scanning the roadmap, and tapping
 * a lesson still navigates to `LessonOverview` with the lesson id. The lesson
 * rows moved from the old `components/roadmap/LessonNode` to the design
 * system's `LessonCard` so this screen matches Home and Explore (spec §35);
 * the roadmap's own curvy path stays where it belongs, on Home.
 */

type ModuleRouteParams = {
  Module: { moduleId: string };
};

const lessonStatus = (lesson: Lesson): LessonStatus => {
  if (lesson.isCompleted) return 'completed';
  if (lesson.isUnlocked) return 'available';
  return 'locked';
};

/** Percentage of a lesson's four activity flags that are done. */
const lessonProgress = (lesson: Lesson): number | undefined => {
  const p = lesson.progress;
  if (!p) return undefined;
  const flags = [p.videoCompleted, p.listenCompleted, p.speakCompleted, p.writeCompleted];
  const done = flags.filter(Boolean).length;
  if (done === 0) return undefined;
  return Math.round((done / flags.length) * 100);
};

export const ModuleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ModuleRouteParams, 'Module'>>();
  const { moduleId } = route.params;

  const { data: rawData, isLoading, isError, error, refetch, isFetching } = useRoadmap();

  const roadmapData = (rawData as ApiResponse<{ roadmap: Category[] }> | undefined)?.data;
  const categories: Category[] = roadmapData?.roadmap ?? [];

  const allModules = categories.flatMap((c: Category) => c.modules);
  const module = allModules.find((m: Module) => m.id === moduleId) ?? null;

  const category =
    categories.find((c: Category) => c.modules.some((m: Module) => m.id === moduleId)) ?? null;

  const handleLessonPress = useCallback(
    (lessonId: string) => {
      navigation.navigate('LessonOverview', { lessonId });
    },
    [navigation],
  );

  const stats = useMemo<Stat[]>(() => {
    if (!module) return [];
    const lessons = module.lessons ?? [];
    const completed = lessons.filter((l: Lesson) => l.isCompleted).length;
    const unlocked = lessons.filter((l: Lesson) => l.isUnlocked).length;
    return [
      {
        value: `${completed}/${lessons.length}`,
        label: 'Lessons done',
        icon: 'check',
        color: colors.green,
      },
      { value: String(unlocked), label: 'Unlocked', icon: 'play', color: colors.blue },
      { value: String(lessons.length), label: 'Total', icon: 'book', color: colors.purple },
    ];
  }, [module]);

  if (isLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={<PageHeader title="Module" />}>
        <View style={styles.center}>
          <LoadingSpinner label="Loading module…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={<PageHeader title="Module" />}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load module"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </AppShell>
    );
  }

  if (!module) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={<PageHeader title="Module" />}>
        <View style={styles.center}>
          <EmptyState
            icon="search"
            title="Module not found"
            message="This module doesn't exist or has been removed."
          />
        </View>
      </AppShell>
    );
  }

  const lessons = module.lessons ?? [];
  const completed = lessons.filter((l: Lesson) => l.isCompleted).length;
  const modulePercent = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore}
      header={<PageHeader title={module.title} />}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <Card variant="raised" padding="roomy" accent={colors.primary} rail style={styles.card}>
        {category ? (
          <View style={styles.breadcrumb}>
            <PetalIcon name="explore" size={14} color={colors.textSecondary} />
            <Text style={[typography.presets.caption, styles.breadcrumbText]} numberOfLines={1}>
              {category.title}
            </Text>
          </View>
        ) : null}

        <Text style={[typography.presets.section, styles.title]}>{module.title}</Text>

        {module.description ? (
          <Text style={[typography.presets.body, styles.description]}>{module.description}</Text>
        ) : null}

        <View style={styles.moduleProgress}>
          <View style={styles.progressHead}>
            <Text style={[typography.presets.caption, styles.progressLabel]}>Module progress</Text>
            <Text style={[typography.presets.caption, styles.progressValue]}>
              {modulePercent}%
            </Text>
          </View>
          <ProgressIndicator
            value={modulePercent}
            color={colors.green}
            accessibilityLabel={`${module.title} is ${modulePercent} percent complete`}
          />
        </View>

        <StatGrid stats={stats} style={styles.stats} />
      </Card>

      <View style={styles.sectionHeader}>
        <PetalIcon name="book" size={18} color={colors.text} />
        <Text style={[typography.presets.cardTitle, styles.sectionTitle]} accessibilityRole="header">
          Lessons
        </Text>
      </View>

      {lessons.length === 0 ? (
        <EmptyState
          icon="pencil"
          title="No lessons yet"
          message="Lessons will appear here when they're ready."
        />
      ) : (
        lessons.map((lesson: Lesson) => (
          <LessonCard
            key={lesson.id}
            title={lesson.title}
            eyebrow={module.title}
            status={lessonStatus(lesson)}
            progress={lessonProgress(lesson)}
            footnote={
              lesson.activities?.length
                ? `${lesson.activities.length} ${
                    lesson.activities.length === 1 ? 'activity' : 'activities'
                  }`
                : undefined
            }
            onPress={
              lesson.isUnlocked || lesson.isCompleted
                ? () => handleLessonPress(lesson.id)
                : undefined
            }
            style={styles.card}
          />
        ))
      )}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    marginBottom: cardSizes.gap,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  breadcrumbText: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  title: {
    color: colors.text,
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  moduleProgress: {
    marginTop: spacing.lg,
  },
  stats: {
    marginTop: spacing.lg,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: colors.textSecondary,
  },
  progressValue: {
    color: colors.green,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
  },
});

export default ModuleScreen;
