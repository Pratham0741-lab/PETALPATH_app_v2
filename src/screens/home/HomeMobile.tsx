import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ContinueLearningCard } from '../../components/cards/ContinueLearningCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRoadmapStore, Lesson, Module, Category } from '../../store/roadmapStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { CategoryHeader } from './components/CategoryHeader';
import { CurvedPathConnector } from './components/CurvedPathConnector';
import { ModuleNode } from './components/ModuleNode';
import { ModuleLessonsModal } from './components/ModuleLessonsModal';
import { colors, spacing, radius, typography } from '../../theme';
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

export const HomeMobile: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    categories,
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

  // Handle measurement retry to handle layout changes and keyboard/layout shifts
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

  // Flatten the curriculum tree and compute absolute layout coordinates
  const layoutData = useMemo(() => {
    const list: VisualRow[] = [];
    let currentY = 10;

    categories.forEach((category) => {
      // 1. Add Category Header Milestone card
      list.push({
        type: 'header',
        id: `header-${category.id}`,
        category,
        yPos: currentY,
      });
      currentY += 105; // milestone header height + spacing

      // 2. Add Category Module nodes
      category.modules.forEach((module) => {
        list.push({
          type: 'node',
          id: `node-${module.id}`,
          module,
          pathColor: getCategoryColor(category.title),
          yPos: currentY,
        });
        currentY += 135; // node row height + spacing
      });
    });

    return { list, totalHeight: currentY + 30 };
  }, [categories]);

  // Pre-calculate the exact center of each circular node for the SVG curved line
  const nodeCenters = useMemo(() => {
    const centers: { x: number; y: number; color: string }[] = [];
    let nodeIdx = 0;

    layoutData.list.forEach((row) => {
      if (row.type === 'node') {
        const xOffset = nodeIdx % 4 === 1 ? 55 : nodeIdx % 4 === 3 ? -55 : 0;
        centers.push({
          x: 150 + xOffset,
          y: row.yPos + 38, // 38px is the vertical radius offset of the 76px circular node
          color: row.pathColor || colors.purple,
        });
        nodeIdx++;
      }
    });

    return centers;
  }, [layoutData]);

  return (
    <ScreenContainer>
      <TopBar title="My Journey" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <SectionHeader
            title="Learning Roadmap"
            subtitle="Embark on a cozy adventure through the stars!"
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
          <View style={styles.content}>
             {/* Continue Learning Card */}
             {currentLesson && (
               <View style={styles.continueCard}>
                 <ContinueLearningCard
                   categoryTitle="Active Lesson"
                   lessonTitle={currentLesson.title}
                   nextActivityTitle={nextActTitle}
                   progressPercent={activePercent}
                   onPressPlay={handlePlayContinue}
                 />
               </View>
             )}


             {/* Scrollable roadmap path container */}
             <View style={[styles.roadmapFlowContainer, { height: layoutData.totalHeight }]}>
               {/* Dynamic Bezier curved path connector */}
               <CurvedPathConnector
                 nodeCenters={nodeCenters}
                 totalHeight={layoutData.totalHeight}
               />

               {/* Absolutely positioned milestones and module nodes */}
               {layoutData.list.map((row, idx) => {
                 if (row.type === 'header' && row.category) {
                   // Find sequence index
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
                   // Find index in visual list
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
                       onLayout={isOngoing ? measureTarget : undefined}
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
          </View>
        )}
      </ScrollView>
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
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  continueCard: {
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    width: '100%',
    maxWidth: 500,
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
    left: 150 - 60, // Centers the 120px wide wrapper around center x = 150
    width: 120,
    alignItems: 'center',
    zIndex: 15,
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
