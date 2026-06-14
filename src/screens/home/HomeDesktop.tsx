import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ContinueLearningCard } from '../../components/cards/ContinueLearningCard';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRoadmapStore, Lesson, Module, Category } from '../../store/roadmapStore';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { CategoryHeader } from './components/CategoryHeader';
import { CurvedPathConnector } from './components/CurvedPathConnector';
import { ModuleNode } from './components/ModuleNode';
import { colors, spacing, radius, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { navigateToActivity } from '../../utils/navigationFlow';

interface VisualRow {
  type: 'header' | 'node';
  id: string;
  category?: Category;
  module?: Module;
  pathColor?: string;
  yPos: number;
}

export const HomeDesktop: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

  const {
    categories,
    selectedModule,
    selectedLesson,
    currentLesson,
    loading,
    error,
    loadRoadmap,
    selectModule,
    selectLesson,
    activities,
  } = useRoadmapStore();

  useFocusEffect(
    React.useCallback(() => {
      loadRoadmap();
    }, [loadRoadmap])
  );

  const handleModuleClick = async (module: Module) => {
    const targetLesson = module.lessons.find(l => !l.isCompleted) || module.lessons[0];
    if (targetLesson && targetLesson.isUnlocked) {
      await selectLesson(targetLesson);
      navigation.navigate('LessonOverview');
    }
  };

  const handleCategoryClick = async (category: Category) => {
    let targetLesson: Lesson | null = null;
    for (const mod of category.modules) {
      const uncompleted = mod.lessons.find(l => !l.isCompleted);
      if (uncompleted) {
        targetLesson = uncompleted;
        break;
      }
    }
    if (!targetLesson && category.modules.length > 0) {
      const firstMod = category.modules[0];
      if (firstMod.lessons.length > 0) {
        targetLesson = firstMod.lessons[0];
      }
    }

    if (targetLesson && targetLesson.isUnlocked) {
      await selectLesson(targetLesson);
      navigation.navigate('LessonOverview');
    }
  };

  const handleLessonClick = async (lesson: Lesson) => {
    await selectLesson(lesson);
    navigation.navigate('LessonOverview');
  };

  const handlePlayActivity = async (activity: any) => {
    await navigateToActivity(navigation, activity);
  };

  const handlePlayContinue = async () => {
    if (!currentLesson) return;
    await selectLesson(currentLesson);
    
    // Find next uncompleted activity
    const progress = currentLesson.progress;
    let targetAct = null;
    if (progress) {
      if (!progress.videoCompleted) {
        targetAct = currentLesson.activities.find(a => a.activityType === 'video');
      } else if (!progress.listenCompleted) {
        targetAct = currentLesson.activities.find(a => a.activityType === 'listen');
      } else if (!progress.speakCompleted) {
        targetAct = currentLesson.activities.find(a => a.activityType === 'speak');
      } else if (!progress.writeCompleted) {
        targetAct = currentLesson.activities.find(a => a.activityType === 'write');
      }
    }
    
    if (!targetAct && currentLesson.activities.length > 0) {
      targetAct = currentLesson.activities[0];
    }

    if (targetAct) {
      await navigateToActivity(navigation, targetAct);
    } else {
      navigation.navigate('LessonOverview');
    }
  };

  const getActivePercent = () => {
    if (!currentLesson || !currentLesson.progress) return 0;
    const progress = currentLesson.progress;
    let count = 0;
    if (progress.videoCompleted) count++;
    if (progress.listenCompleted) count++;
    if (progress.speakCompleted) count++;
    if (progress.writeCompleted) count++;
    return count * 25;
  };

  const getNextActivityTitle = () => {
    if (!currentLesson) return 'Watch Standing Line Tutorial';
    const progress = currentLesson.progress;
    if (!progress) {
      return currentLesson.activities[0]?.title || 'Watch Tutorial';
    }
    if (!progress.videoCompleted) {
      return currentLesson.activities.find(a => a.activityType === 'video')?.title || 'Watch Tutorial';
    }
    if (!progress.listenCompleted) {
      return currentLesson.activities.find(a => a.activityType === 'listen')?.title || 'Listen & Choose';
    }
    if (!progress.speakCompleted) {
      return currentLesson.activities.find(a => a.activityType === 'speak')?.title || 'Practice Speaking';
    }
    if (!progress.writeCompleted) {
      return currentLesson.activities.find(a => a.activityType === 'write')?.title || 'Trace Shape';
    }
    return 'All Completed!';
  };

  const activePercent = getActivePercent();
  const nextActTitle = getNextActivityTitle();

  const getCategoryColor = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('prewriting')) return '#EC4899';
    if (lower.includes('shape')) return '#3B82F6';
    if (lower.includes('alpha') || lower.includes('letter')) return '#10B981';
    if (lower.includes('num')) return '#F97316';
    if (lower.includes('word')) return '#8A5CF6';
    return '#06B6D4';
  };

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'EASY':
        return colors.green;
      case 'MEDIUM':
        return colors.yellow;
      case 'HARD':
        return '#EF4444';
      default:
        return colors.green;
    }
  };

  const getSubActivityCompletion = (type: string) => {
    if (!selectedLesson || !selectedLesson.progress) return false;
    const progress = selectedLesson.progress;
    if (type === 'video') return progress.videoCompleted;
    if (type === 'listen') return progress.listenCompleted;
    if (type === 'speak') return progress.speakCompleted;
    if (type === 'write') return progress.writeCompleted;
    return false;
  };

  // Compute absolute layout mapping
  const layoutData = useMemo(() => {
    const list: VisualRow[] = [];
    let currentY = 10;

    categories.forEach((category) => {
      list.push({
        type: 'header',
        id: `header-${category.id}`,
        category,
        yPos: currentY,
      });
      currentY += 105;

      category.modules.forEach((module) => {
        list.push({
          type: 'node',
          id: `node-${module.id}`,
          module,
          pathColor: getCategoryColor(category.title),
          yPos: currentY,
        });
        currentY += 135;
      });
    });

    return { list, totalHeight: currentY + 30 };
  }, [categories]);

  // Pre-calculate circular node centers
  const nodeCenters = useMemo(() => {
    const centers: { x: number; y: number; color: string }[] = [];
    let nodeIdx = 0;

    layoutData.list.forEach((row) => {
      if (row.type === 'node') {
        const xOffset = nodeIdx % 4 === 1 ? 55 : nodeIdx % 4 === 3 ? -55 : 0;
        centers.push({
          x: 150 + xOffset,
          y: row.yPos + 38,
          color: row.pathColor || colors.purple,
        });
        nodeIdx++;
      }
    });

    return centers;
  }, [layoutData]);

  return (
    <ScreenContainer>
      <View style={styles.layout}>
        {/* Center Roadmap Column */}
        <View style={styles.centerColumn}>
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <SectionHeader
                title="Learning Roadmap"
                subtitle="Complete exercises sequentially to help Dax and friends!"
              />
            </View>

            {loading && categories.length === 0 ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.purple} />
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <View style={[styles.roadmapFlowContainer, { height: layoutData.totalHeight }]}>
                {/* SVG path connector */}
                <CurvedPathConnector
                  nodeCenters={nodeCenters}
                  totalHeight={layoutData.totalHeight}
                />

                {/* Render visual rows absolutely */}
                {layoutData.list.map((row, idx) => {
                  if (row.type === 'header' && row.category) {
                    const catIdx = categories.findIndex(c => c.id === row.category?.id) + 1;
                    return (
                      <View
                        key={row.id}
                        style={[styles.headerWrapper, { top: row.yPos }]}
                      >
                        <CategoryHeader
                          category={row.category}
                          index={catIdx}
                          onPress={() => handleCategoryClick(row.category!)}
                        />
                      </View>
                    );
                  } else if (row.type === 'node' && row.module && row.pathColor) {
                    const nodeIdx = layoutData.list.filter((r, i) => r.type === 'node' && i < idx).length;
                    const xOffset = nodeIdx % 4 === 1 ? 55 : nodeIdx % 4 === 3 ? -55 : 0;

                    return (
                      <View
                        key={row.id}
                        style={[styles.nodeWrapper, { top: row.yPos }]}
                      >
                        <ModuleNode
                          module={row.module}
                          color={row.pathColor}
                          xOffset={xOffset}
                          index={nodeIdx}
                          onPress={() => handleModuleClick(row.module!)}
                        />
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Right Dashboard Details Column */}
        <View style={styles.rightColumn}>
          <ScrollView contentContainerStyle={styles.rightContent} showsVerticalScrollIndicator={false}>
            {/* User Info Avatar Card */}
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>Learning Buddy</Text>
              <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
            </View>

            {/* Continue Learning Card */}
            {currentLesson && (
              <View style={styles.sidebarSection}>
                <ContinueLearningCard
                  categoryTitle="Ready to Learn"
                  lessonTitle={currentLesson.title}
                  nextActivityTitle={nextActTitle}
                  progressPercent={activePercent}
                  onPressPlay={handlePlayContinue}
                />
              </View>
            )}

            {/* Selected Module & Lesson Details */}
            {selectedModule ? (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarTitle}>Module: {selectedModule.title}</Text>
                
                {/* Horizontal / Grid Lesson Selector */}
                <View style={styles.lessonsGrid}>
                  {selectedModule.lessons.map((lesson) => {
                    const isSelected = selectedLesson?.id === lesson.id;
                    const isLocked = !lesson.isUnlocked;
                    const isCompleted = lesson.isCompleted;
                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        activeOpacity={0.8}
                        onPress={() => handleLessonClick(lesson)}
                        style={[
                          styles.lessonGridItem,
                          isSelected && styles.selectedGridItem,
                          isLocked && styles.lockedGridItem,
                          isCompleted && styles.completedGridItem,
                        ]}
                      >
                        <Ionicons
                          name={
                            isLocked
                              ? 'lock-closed'
                              : isCompleted
                              ? 'checkmark-circle'
                              : 'play'
                          }
                          size={16}
                          color={
                            isLocked
                              ? colors.textMuted
                              : isCompleted
                              ? colors.green
                              : colors.purple
                          }
                        />
                        <Text style={styles.gridItemText} numberOfLines={1}>
                          {lesson.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Selected Lesson Details Card */}
                {selectedLesson ? (
                  <View style={styles.lessonDetailCard}>
                    <View style={styles.lessonDetailHeader}>
                      <View style={styles.titleRow}>
                        <Text style={styles.detailTitle}>{selectedLesson.title}</Text>
                        <View
                          style={[
                            styles.diffBadge,
                            {
                              backgroundColor: getDifficultyColor(selectedLesson.difficulty) + '20',
                              borderColor: getDifficultyColor(selectedLesson.difficulty),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.diffText,
                              { color: getDifficultyColor(selectedLesson.difficulty) },
                            ]}
                          >
                            {selectedLesson.difficulty}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.detailDesc}>
                        {selectedLesson.description || 'Practice your drawing, listening, and speaking skills.'}
                      </Text>
                    </View>

                    {/* Sub-activities List with start button */}
                    <Text style={styles.activitiesHeader}>Exercise Checklist</Text>
                    <View style={styles.activitiesList}>
                      {activities.map((act) => {
                        const isCompleted = getSubActivityCompletion(act.activityType);
                        return (
                          <View key={act.id} style={styles.activityItem}>
                            <Ionicons
                              name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                              size={20}
                              color={isCompleted ? colors.green : colors.textMuted}
                              style={styles.activityIcon}
                            />
                            <View style={styles.activityTextContainer}>
                              <Text style={styles.activityTitle}>{act.title}</Text>
                              <Text style={styles.activityTypeLabel}>
                                {act.activityType.toUpperCase()}
                              </Text>
                            </View>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => handlePlayActivity(act)}
                              style={[styles.activityPlayBtn, isCompleted && styles.completedPlayBtn]}
                            >
                              <Ionicons name="play" size={14} color={colors.white} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyModule}>
                <Ionicons name="sparkles" size={36} color={colors.border} />
                <Text style={styles.emptyModuleText}>Select a module node to view lessons</Text>
              </View>
            )}
          </ScrollView>
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
  centerColumn: {
    flex: 1.2,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  rightColumn: {
    flex: 0.8,
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    marginBottom: spacing.md,
  },
  roadmapFlowContainer: {
    position: 'relative',
    width: 300,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  headerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: 300,
    zIndex: 10,
  },
  nodeWrapper: {
    position: 'absolute',
    left: 150 - 60,
    width: 120,
    alignItems: 'center',
    zIndex: 15,
  },
  rightContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sidebarSection: {
    marginBottom: spacing.xl,
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  mentorCard: {
    marginBottom: spacing.sm,
  },
  lessonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  lessonGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36, 43, 92, 0.4)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  selectedGridItem: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(138, 92, 246, 0.15)',
  },
  lockedGridItem: {
    opacity: 0.5,
  },
  completedGridItem: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  gridItemText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 70,
  },
  lessonDetailCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  lessonDetailHeader: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  diffBadge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  diffText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  detailDesc: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  activitiesHeader: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  activitiesList: {
    gap: spacing.xs,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E234D',
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  activityIcon: {
    marginRight: spacing.sm,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  activityTypeLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  activityPlayBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedPlayBtn: {
    backgroundColor: colors.green,
  },
  emptyModule: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.sm,
  },
  emptyModuleText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
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
});
