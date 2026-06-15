import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ContinueLearningCard } from '../../components/cards/ContinueLearningCard';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRoadmapStore, Lesson, Module, Category } from '../../store/roadmapStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { CategoryHeader } from './components/CategoryHeader';
import { CurvedPathConnector } from './components/CurvedPathConnector';
import { ModuleNode } from './components/ModuleNode';
import { colors, spacing, radius, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { navigateToActivity } from '../../utils/navigationFlow';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

interface VisualRow {
  type: 'header' | 'node';
  id: string;
  category?: Category;
  module?: Module;
  pathColor?: string;
  yPos: number;
}

export const HomeTablet: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;
  const navigation = useNavigation<any>();

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
  } = useRoadmapStore();

  const { seenTutorials } = useTutorialStore();
  const seenHome = seenTutorials['home'] === true;
  const isFirstVisit = !seenHome;

  const ongoingNodeRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);

  const measureTarget = useCallback(() => {
    if (ongoingNodeRef.current) {
      ongoingNodeRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          // Point precisely to the center of the ongoing circular milestone node (center x, center y of the 76px circle)
          setHandCoords({ x: x + width / 2, y: y + 38 });
        }
      });
    }
  }, []);

  // Handle measurement retry to handle layout changes and layout shifts
  useEffect(() => {
    measureTarget();
    const t1 = setTimeout(measureTarget, 100);
    const t2 = setTimeout(measureTarget, 400);
    const t3 = setTimeout(measureTarget, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [currentLesson, measureTarget]);

  useFocusEffect(
    React.useCallback(() => {
      loadRoadmap();
      const timer = setTimeout(measureTarget, 400);
      return () => clearTimeout(timer);
    }, [loadRoadmap, measureTarget])
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

  const handleSelectLesson = async (lesson: Lesson) => {
    await selectLesson(lesson);
    navigation.navigate('LessonOverview');
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
        {/* Left Side: Roadmap flow (60% width) */}
        <View style={styles.leftColumn}>
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <SectionHeader
                title="Your Learning Journey"
                subtitle="Follow the paths to unlock cute stars!"
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
                    
                    // Identify the active unlocked milestone or fallback to first node
                    const hasOngoingModule = layoutData.list.some(r => r.type === 'node' && r.module && r.module.isUnlocked && !r.module.isCompleted);
                    const isOngoing = hasOngoingModule 
                      ? (row.module.isUnlocked && !row.module.isCompleted)
                      : (row.id === layoutData.list.find(r => r.type === 'node')?.id);

                    return (
                      <View
                        key={row.id}
                        ref={isOngoing ? ongoingNodeRef : undefined}
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

        {/* Right Side: Sidebar details (40% width) */}
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

            {/* Selected Module Lessons */}
            {selectedModule ? (
              <View style={styles.sidebarSection}>
                <View style={styles.moduleHeader}>
                  <Text style={styles.moduleTitle}>{selectedModule.title}</Text>
                  {selectedModule.description ? (
                    <Text style={styles.moduleDesc}>{selectedModule.description}</Text>
                  ) : null}
                </View>

                {/* Progress detail list */}
                <View style={styles.progressDetailCard}>
                  <Text style={styles.progressCardTitle}>Module Lessons</Text>
                  <View style={styles.lessonsList}>
                    {selectedModule.lessons.map((lesson) => {
                      const isLocked = !lesson.isUnlocked;
                      const isCompleted = lesson.isCompleted;
                      const diffColor = getDifficultyColor(lesson.difficulty);

                      return (
                        <View
                          key={lesson.id}
                          style={[
                            styles.lessonItem,
                            isLocked && styles.lockedLesson,
                            isCompleted && styles.completedLesson,
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
                            size={18}
                            color={
                              isLocked
                                ? colors.textMuted
                                : isCompleted
                                ? colors.green
                                : colors.purple
                            }
                            style={styles.lessonIcon}
                          />
                          <View style={styles.lessonTextContainer}>
                            <Text style={styles.lessonTitleText}>{lesson.title}</Text>
                            {!isLocked && (
                              <Text style={[styles.diffText, { color: diffColor }]}>
                                {lesson.difficulty}
                              </Text>
                            )}
                          </View>

                          {!isLocked ? (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => handleSelectLesson(lesson)}
                              style={styles.playBtn}
                            >
                              <Ionicons name="play-circle" size={28} color={colors.purple} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
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
      <NavigationGuide
        screenKey="home"
        guideKey="welcome"
        message="Let's continue our adventure!"
        showHand={isFirstVisit && !!handCoords}
        handMode="tap"
        handX={handCoords?.x}
        handY={handCoords?.y}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  leftColumn: {
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
  moduleHeader: {
    marginBottom: spacing.md,
  },
  moduleTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  moduleDesc: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  progressDetailCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  progressCardTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  lessonsList: {
    gap: spacing.sm,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36, 43, 92, 0.4)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lockedLesson: {
    opacity: 0.5,
  },
  completedLesson: {
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  lessonIcon: {
    marginRight: spacing.md,
  },
  lessonTextContainer: {
    flex: 1,
  },
  lessonTitleText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  diffText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  playBtn: {
    padding: 2,
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
