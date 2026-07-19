import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Platform,
  useWindowDimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { toUserMessage } from '../../api/errors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useChildStore } from '../../store/childStore';
import { useRoadmapStore, Lesson, Module } from '../../store/roadmapStore';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { navigateToActivity } from '../../utils/navigationFlow';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';
import {
  useRoadmap,
  useDashboardOverview,
  useRewardsOverview,
  useRecommendation,
} from '../../hooks/useLearningQueries';
import { useDailyStreak } from '../../hooks/useRewards';
import { useChildSwitch } from '../../hooks/useChildSwitch';
import { deriveXPState } from '../../services/gamification/derivations';
import { getAvatarEmoji, getAvatarBgColor } from '../profile/ChildSelectionScreen';
import { ProgressBar } from '../../components/ui/ProgressBar';

// -------------------------------------------------------------
// DECORATIVE BACKGROUND COMPONENTS
// -------------------------------------------------------------

const LeftHill = React.memo(({ top, width }: { top: number; width: number }) => (
  <View style={{ position: 'absolute', top, left: 0, width: width * 0.45, height: 180, zIndex: -2 }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path d="M 0 100 C 40 65, 80 75, 100 100 Z" fill="#E8F4E1" />
    </Svg>
  </View>
));

const RightHill = React.memo(({ top, width }: { top: number; width: number }) => (
  <View style={{ position: 'absolute', top, right: 0, width: width * 0.45, height: 180, zIndex: -2 }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path d="M 100 100 C 60 60, 20 70, 0 100 Z" fill="#EAF5E3" />
    </Svg>
  </View>
));

const GardenTree = React.memo(({ top, left }: { top: number; left: number }) => (
  <View style={{ position: 'absolute', top, left, width: 40, height: 50, zIndex: -2 }}>
    <Svg width="40" height="50" viewBox="0 0 40 50">
      <Rect x="18" y="30" width="4" height="20" rx="1" fill="#8C6F5A" />
      <Circle cx="20" cy="18" r="15" fill="#8DBB75" />
      <Circle cx="14" cy="14" r="8" fill="#9CD184" />
      <Circle cx="15" cy="12" r="2.5" fill="#F6B5C5" />
      <Circle cx="25" cy="20" r="2.5" fill="#F6B5C5" />
    </Svg>
  </View>
));

const GardenBush = React.memo(({ top, left }: { top: number; left: number }) => (
  <View style={{ position: 'absolute', top, left, width: 35, height: 22, zIndex: -2 }}>
    <Svg width="35" height="22" viewBox="0 0 35 22">
      <Path d="M 4 22 C 0 8, 12 4, 17 12 C 22 4, 34 8, 30 22 Z" fill="#9CD184" />
      <Circle cx="10" cy="14" r="1.5" fill="#FFF" />
      <Circle cx="22" cy="12" r="1.5" fill="#FFF" />
    </Svg>
  </View>
));

const TinyFlower = React.memo(({ top, left, color = '#F6B5C5' }: { top: number; left: number; color?: string }) => (
  <View style={{ position: 'absolute', top, left, width: 14, height: 18, zIndex: -2 }}>
    <Svg width="14" height="18" viewBox="0 0 14 18">
      <Path d="M7 8 L7 18" stroke="#7CA767" strokeWidth="1.5" />
      <Circle cx="7" cy="6" r="3.5" fill={color} />
      <Circle cx="3.5" cy="6" r="2.5" fill={color} />
      <Circle cx="10.5" cy="6" r="2.5" fill={color} />
      <Circle cx="7" cy="2.5" r="2.5" fill={color} />
      <Circle cx="7" cy="6" r="1.5" fill="#F7C94B" />
    </Svg>
  </View>
));

const FloatingPetal = React.memo(({ top, left, delay = 0 }: { top: number; left: number; delay?: number }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 6000 + Math.random() * 4000,
          useNativeDriver: true,
        })
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 80],
  });

  const translateX = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 12, 0],
  });

  const rotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.7, 0.7, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left,
        width: 12,
        height: 7,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
        zIndex: -1,
      }}
    >
      <Svg width="12" height="7" viewBox="0 0 12 7">
        <Path d="M 0 3.5 C 2.5 0, 9.5 0, 12 3.5 C 9.5 7, 2.5 7, 0 3.5 Z" fill="#F6B5C5" opacity={0.8} />
      </Svg>
    </Animated.View>
  );
});

// -------------------------------------------------------------
// FLOWER NODE ANIMATION WRAPPERS
// -------------------------------------------------------------

const CurrentFlowerNode = ({ size, style, children }: { size: number; style?: any; children: React.ReactNode }) => {
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });

  const glowOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Outer Breathing Purple Glow for Active Node */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          borderWidth: 2.5,
          borderColor: '#C0B3F1',
          backgroundColor: '#EDE8FF',
          opacity: glowOpacity,
          transform: [{ scale }],
        }}
      />
      <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </View>
  );
};

const CompletedFlowerNode = React.memo(({ size, children, onPress }: { size: number; children: React.ReactNode; onPress: () => void }) => {
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;

  const triggerWiggle = () => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: -1, duration: 120, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: 0.5, duration: 90, useNativeDriver: true }),
      Animated.timing(pressAnim, { toValue: 0, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    Animated.loop(
      Animated.timing(wiggleAnim, {
        toValue: 1,
        duration: 10000 + Math.random() * 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const loopWiggle = wiggleAnim.interpolate({
    inputRange: [0, 0.90, 0.92, 0.94, 0.96, 0.98, 1.0],
    outputRange: [0, 0, 1, -1, 0.5, -0.5, 0],
  });

  const combinedAnim = Animated.add(loopWiggle, pressAnim);

  const rotate = combinedAnim.interpolate({
    inputRange: [-1.5, 1.5],
    outputRange: ['-12deg', '12deg'],
  });

  return (
    <Pressable
      onPress={() => {
        triggerWiggle();
        onPress();
      }}
      style={{ width: size, height: size }}
    >
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
});

// -------------------------------------------------------------
// MAIN PORTAL IMPLEMENTATION
// -------------------------------------------------------------

interface RoadmapItem {
  type: 'module' | 'lesson' | 'module-gate' | 'flag';
  id: string;
  module?: Module;
  lesson?: Lesson;
  title?: string;
  status: 'completed' | 'current' | 'locked';
  indexInModule?: number;
  totalInModule?: number;
  parentModuleId?: string;
  displayOrder?: number;
  isQuiz?: boolean;
}

export const HomeMobile: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const childrenList = useChildStore((state) => state.childrenList);
  const selectLesson = useRoadmapStore((state) => state.selectLesson);

  const scrollViewRef = useRef<ScrollView>(null);
  const hasAutoScrolled = useRef(false);

  // States
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showFloatingResume, setShowFloatingResume] = useState(false);
  const [activeLessonY, setActiveLessonY] = useState(0);

  // React Query Hooks
  const {
    data: rawRoadmap,
    isLoading: roadmapLoading,
    error: roadmapError,
    refetch: refetchRoadmap,
  } = useRoadmap();

  const {
    data: rawDashboard,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useDashboardOverview();

  const {
    data: rawRewards,
    refetch: refetchRewards,
  } = useRewardsOverview();

  const {
    data: rawStreak,
    refetch: refetchStreak,
  } = useDailyStreak();

  const {
    data: rawRecommendation,
  } = useRecommendation();

  const { switchChild } = useChildSwitch();

  // Automatically refresh queries on screen focus to ensure lesson unlocks update instantly in UI
  useFocusEffect(
    useCallback(() => {
      refetchRoadmap();
      refetchDashboard();
      refetchRewards();
      refetchStreak();
    }, [refetchRoadmap, refetchDashboard, refetchRewards, refetchStreak])
  );

  // Parsing Data
  const roadmapData = (rawRoadmap as any)?.data;
  const grade = roadmapData?.grade || '';
  const themes = (roadmapData?.themes ?? []) as any[];
  const nodes = (roadmapData?.nodes ?? []) as any[];
  const currentLesson = (roadmapData?.currentNode ?? null) as any;

  const dashboardOverview = ((rawDashboard as any)?.data ?? {}) as any;
  const rewardsOverview = ((rawRewards as any)?.data ?? {}) as any;
  const streak = (rawStreak as any)?.data?.currentStreak ?? dashboardOverview.streak ?? 0;
  const xpState = deriveXPState(rewardsOverview.totalStars ?? 0);

  const recommendation = (rawRecommendation as any)?.data ?? null;

  // Refresh handler
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchRoadmap(),
      refetchDashboard(),
      refetchRewards(),
      refetchStreak(),
    ]);
    setRefreshing(false);
  }, [refetchRoadmap, refetchDashboard, refetchRewards, refetchStreak]);

  // Handle Child Switch
  const handleChildSelect = async (childId: string) => {
    setShowChildDropdown(false);
    hasAutoScrolled.current = false;
    setActiveLessonY(0);
    await switchChild(childId);
  };

  // Build the unified timeline array
  const roadmapItems = useMemo<RoadmapItem[]>(() => {
    const list: RoadmapItem[] = [];
    if (!themes || themes.length === 0 || !nodes || nodes.length === 0) return list;

    // Find current theme index
    const currentThemeId = currentLesson?.themeId || themes[0].id;
    const currentThemeIdx = themes.findIndex((t) => t.id === currentThemeId);

    themes.forEach((theme, tIdx) => {
      if (tIdx < currentThemeIdx) {
        // Collapsed previous theme
        list.push({
          type: 'module-gate',
          id: `theme-gate-${theme.id}`,
          title: theme.title,
          status: 'completed',
        });
      } else if (tIdx === currentThemeIdx) {
        // Current theme (expanded)
        list.push({
          type: 'module',
          id: `theme-header-${theme.id}`,
          title: theme.title,
          status: 'completed',
        });

        // Add all nodes for this theme
        const themeNodes = nodes.filter((n) => n.themeId === theme.id);
        themeNodes.forEach((node, nIdx) => {
          list.push({
            type: 'lesson',
            id: node.id,
            lesson: node,
            status: node.isCompleted ? 'completed' : (currentLesson && node.id === currentLesson.id ? 'current' : 'locked'),
            displayOrder: nIdx + 1,
            isQuiz: node.title.toLowerCase().includes('quiz') || node.title.toLowerCase().includes('test'),
          });
        });
      } else {
        // Collapsed future theme
        list.push({
          type: 'module-gate',
          id: `theme-gate-${theme.id}`,
          title: theme.title,
          status: 'locked',
        });
      }
    });

    // Add flag at the end of the timeline
    list.push({
      type: 'flag',
      id: 'timeline-end-flag',
      status: 'locked',
    });

    return list;
  }, [themes, nodes, currentLesson]);

  // Layout node measurements for drawing paths
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 540);
  const leftOffset = (windowWidth - screenWidth) / 2;
  const pathCenterX = screenWidth * 0.32;

  const nodeLayouts = useMemo(() => {
    return roadmapItems.map((item, idx) => {
      // Wavy sine oscillation
      const x = Math.sin(idx * 1.2) * 28 - (screenWidth * 0.15);
      return { x, height: 100 };
    });
  }, [roadmapItems, screenWidth]);

  // One-time auto-scroll to current lesson
  useEffect(() => {
    if (activeLessonY > 0 && !hasAutoScrolled.current && roadmapItems.length > 5) {
      const scrollPosition = activeLessonY - windowHeight * 0.25;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollPosition), animated: true });
      hasAutoScrolled.current = true;
    }
  }, [activeLessonY, roadmapItems, windowHeight]);

  // Handle Scroll to toggle Floating Resume Button
  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const threshold = windowHeight * 0.35; // 35% of screen height
    if (y > threshold) {
      if (!showFloatingResume) setShowFloatingResume(true);
    } else {
      if (showFloatingResume) setShowFloatingResume(false);
    }
  };

  // Find dynamic next activity completion targets
  const getNextIncompleteActivity = useCallback((lesson: Lesson) => {
    const progress = lesson.progress;
    if (!progress) {
      return lesson.activities[0] || null;
    }
    // Loop through lesson activities array dynamically to find the next incomplete target
    for (const act of lesson.activities) {
      if (act.activityType === 'video' && !progress.videoCompleted) return act;
      if (act.activityType === 'listen' && !progress.listenCompleted) return act;
      if (act.activityType === 'speak' && !progress.speakCompleted) return act;
      if (act.activityType === 'write' && !progress.writeCompleted) return act;
    }
    return lesson.activities[0] || null;
  }, []);

  // Compute remaining activities
  const getRemainingActivitiesCount = useCallback((lesson: Lesson) => {
    const progress = lesson.progress;
    if (!progress) return lesson.activities.length;
    let completed = 0;
    if (progress.videoCompleted) completed++;
    if (progress.listenCompleted) completed++;
    if (progress.speakCompleted) completed++;
    if (progress.writeCompleted) completed++;
    return Math.max(0, lesson.activities.length - completed);
  }, []);

  // Resume button click handler
  const handleResume = async () => {
    if (!currentLesson) return;
    await selectLesson(currentLesson);
    const targetActivity = getNextIncompleteActivity(currentLesson);
    if (targetActivity) {
      await navigateToActivity(navigation, targetActivity);
    } else {
      navigation.navigate('LessonOverview', { lessonId: currentLesson.id });
    }
  };

  const handleLessonClick = async (lesson: Lesson) => {
    if (lesson.isUnlocked || lesson.isCompleted) {
      await selectLesson(lesson);
      navigation.navigate('LessonOverview', { lessonId: lesson.id });
    }
  };

  // Calculate unlock countdown timer
  const hoursUntilMidnight = useMemo(() => {
    return Math.max(1, 24 - new Date().getHours());
  }, [refreshing]);

  // Today's Goal Metrics
  const dailyGoal = useMemo(() => {
    if (dashboardOverview.dailyGoal && dashboardOverview.dailyGoal > 0) {
      return dashboardOverview.dailyGoal;
    }
    return currentLesson?.activities.length ?? 4;
  }, [dashboardOverview, currentLesson]);

  const completedActivitiesToday = useMemo(() => {
    if (!currentLesson || !currentLesson.progress) return 0;
    let count = 0;
    const p = currentLesson.progress;
    if (p.videoCompleted) count++;
    if (p.listenCompleted) count++;
    if (p.speakCompleted) count++;
    if (p.writeCompleted) count++;
    return count;
  }, [currentLesson]);

  const isTodayComplete = completedActivitiesToday >= dailyGoal || (nodes.length > 0 && nodes.every((n: any) => n.isCompleted));
  const goalPercentage = Math.min(100, Math.round((completedActivitiesToday / dailyGoal) * 100));

  // Latest Unlocks list
  const latestUnlocks = useMemo(() => {
    const list: any[] = [];
    const achievements = dashboardOverview.recentAchievements;
    if (achievements) {
      if (achievements.badges) {
        achievements.badges.forEach((b: any) => {
          list.push({ id: `b-${b.id}`, title: b.name, type: 'Badge', icon: '🏅', color: '#FFF3D6', desc: 'New Badge Unlocked!' });
        });
      }
      if (achievements.stickers) {
        achievements.stickers.forEach((s: any) => {
          list.push({ id: `s-${s.id}`, title: s.name, type: 'Sticker', icon: '🎉', color: '#FFF2F5', desc: 'Sticker Earned!' });
        });
      }
    }
    return list;
  }, [dashboardOverview]);

  // Calculate difficulty stars
  const getModuleStars = (lessons: Lesson[]) => {
    if (lessons.length === 0) return '★★★☆☆';
    const difficulties = lessons.map((l) => l.difficulty);
    if (difficulties.includes('HARD')) return '★★★★★';
    if (difficulties.includes('MEDIUM')) return '★★★★☆';
    return '★★☆☆☆';
  };

  // Loading indicator
  if (roadmapLoading && nodes.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>Loading your learning path...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (roadmapError && nodes.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load roadmap"
            message={toUserMessage(roadmapError)}
            onRetry={refetchRoadmap}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Empty state
  if (nodes.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <EmptyState
            icon="🌱"
            title="No roadmap available"
            message="Your companion will prepare your learning path shortly!"
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.root}>
        {/* TOP HEADER & CHILD SWITCHER DROPDOWN */}
        <View style={styles.topBar}>
          <View style={styles.topBarContent}>
            <Text style={styles.logoText}>
              <Text style={{ color: '#F6B5C5' }}>🌸 </Text>
              <Text style={{ color: '#855CF8' }}>PetalPath</Text>
            </Text>

            {/* STREAK & XP & PROFILE ROW */}
            <View style={styles.headerStatsRow}>
              {/* Day Streak */}
              <View style={styles.headerStatItem}>
                <View style={styles.headerStatValueRow}>
                  <Text style={styles.headerStatIcon}>🔥</Text>
                  <Text style={styles.headerStatValue}>{streak}</Text>
                </View>
                <Text style={styles.headerStatLabel}>Day streak</Text>
              </View>

              {/* XP */}
              <View style={styles.headerStatItem}>
                <View style={styles.headerStatValueRow}>
                  <Text style={styles.headerStatIcon}>⭐</Text>
                  <Text style={styles.headerStatValue}>{xpState.xp}</Text>
                </View>
                <Text style={styles.headerStatLabel}>XP</Text>
              </View>

              {/* Child Trigger */}
              <Pressable
                style={styles.childTrigger}
                onPress={() => setShowChildDropdown(!showChildDropdown)}
                accessibilityRole="button"
                accessibilityLabel="Switch profile"
              >
                <View style={[styles.avatarCircle, { backgroundColor: getAvatarBgColor(activeChild?.avatar ?? '') }]}>
                  <Text style={styles.avatarEmoji}>{getAvatarEmoji(activeChild?.avatar ?? '')}</Text>
                </View>
                <Ionicons name={showChildDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {showChildDropdown && (
            <View style={styles.dropdown}>
              {childrenList
                .filter((c: any) => c.id !== activeChild?.id)
                .map((child) => (
                  <Pressable
                    key={child.id}
                    style={styles.dropdownItem}
                    onPress={() => handleChildSelect(child.id)}
                  >
                    <View style={[styles.avatarCircleMini, { backgroundColor: getAvatarBgColor(child.avatar) }]}>
                      <Text style={styles.avatarEmojiMini}>{getAvatarEmoji(child.avatar)}</Text>
                    </View>
                    <Text style={styles.dropdownItemText}>{child.name}</Text>
                  </Pressable>
                ))}
              {childrenList.filter((c: any) => c.id !== activeChild?.id).length === 0 && (
                <Text style={styles.dropdownEmptyText}>No other profiles</Text>
              )}
              <View style={styles.dropdownDivider} />
              <Pressable
                style={styles.dropdownItem}
                onPress={() => {
                  setShowChildDropdown(false);
                  navigation.navigate('ChildSelection');
                }}
              >
                <View style={[styles.avatarCircleMini, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="people" size={12} color={colors.purple} />
                </View>
                <Text style={[styles.dropdownItemText, { color: colors.purple }]}>Manage Profiles</Text>
              </Pressable>
            </View>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { width: screenWidth, alignSelf: 'center' }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
          }
        >
          {/* PERSISTENT CONTINUE LEARNING CARD */}
          {currentLesson && (
            <Pressable style={styles.continueCard} onPress={handleResume}>
              <View style={styles.continueCardLeft}>
                <Text style={styles.continueCardLabel}>CONTINUE LEARNING</Text>
                <Text style={styles.continueTopic}>
                  {themes.find((t: any) => t.id === currentLesson.themeId)?.title || 'Active Topic'}
                </Text>
                <Text style={styles.continueLesson}>{currentLesson.title}</Text>
                <Text style={styles.continueRemaining}>
                  {getRemainingActivitiesCount(currentLesson)} activities left
                </Text>
                <Pressable style={styles.resumeBtn} onPress={handleResume}>
                  <Text style={styles.resumeBtnText}>Resume</Text>
                  <Ionicons name="play" size={14} color={colors.purple} style={{ marginLeft: 6 }} />
                </Pressable>
              </View>

              {/* Illustration on the right */}
              <View style={styles.continueCardRight}>
                <View style={styles.plantIllustrationBg}>
                  <Text style={styles.plantIllustrationEmoji}>🌱</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* INTERACTIVE ROADMAP CONNECTING PATHS & TIMELINE */}
          <View style={styles.roadmapBox}>


            {(() => {
              let nodeCount = 0;
              const computedRoadmapItems = roadmapItems.map((item) => {
                if (item.type === 'module') {
                  return { item, layout: null };
                }
                const x = Math.sin(nodeCount * 1.2) * 28 - (screenWidth * 0.15);
                nodeCount++;
                return { item, layout: { x, height: 100 } };
              });

              return computedRoadmapItems.map((computedItem, idx) => {
                const { item, layout } = computedItem;

                if (item.type === 'module') {
                  return (
                    <View key={item.id} style={styles.themeHeaderRow}>
                      <View style={styles.themeHeaderDivider} />
                      <Text style={styles.themeHeaderTitle}>{item.title}</Text>
                      <View style={styles.themeHeaderDivider} />
                    </View>
                  );
                }

                if (!layout) return null;

                const les = item.lesson;
                const isHero = item.status === 'current' && item.type === 'lesson';
                const nodeSize = isHero ? 50 : 44;
                const nodeLeft = pathCenterX + layout.x - nodeSize / 2;
                const rowHeight = layout.height;
                const nodeTop = (rowHeight - nodeSize) / 2;

                // Find the next node for drawing connection paths
                let pathSegment = null;
                const nextNodeItem = computedRoadmapItems.slice(idx + 1).find(c => c.layout !== null);
                const nextImmediateItem = roadmapItems[idx + 1];

                if (nextNodeItem && nextNodeItem.layout && nextImmediateItem && nextImmediateItem.type !== 'module') {
                  const segmentHeight = rowHeight;
                  const startX = pathCenterX + layout.x;
                  const endX = pathCenterX + nextNodeItem.layout.x;
                  const midY = segmentHeight / 2;
                  const d = `M ${startX} 0 C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${segmentHeight}`;

                  // Connection line state colors
                  const isCurrentConnector = item.status === 'completed' && nextNodeItem.item.status === 'current';
                  let strokeColor = '#E5E5EA'; // Grey (Locked)
                  if (item.status === 'completed' && nextNodeItem.item.status === 'completed') {
                    strokeColor = '#8DBB75'; // Completed (Green)
                  } else if (isCurrentConnector || item.status === 'current') {
                    strokeColor = '#8B78D8'; // Active/Current (Purple)
                  }

                  pathSegment = (
                    <View style={[styles.connectorWrap, { top: rowHeight / 2, height: segmentHeight }]} pointerEvents="none">
                      <Svg width={screenWidth} height={segmentHeight}>
                        <Path d={d} stroke="#FFE5D9" strokeWidth={18} fill="none" strokeLinecap="round" opacity={0.6} />
                        <Path
                          d={d}
                          stroke={strokeColor}
                          strokeWidth={4}
                          strokeDasharray={isCurrentConnector ? '6, 8' : undefined}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  );
                }

                // Node Icon Component
                let nodeIcon = null;
                const isLocked = item.status === 'locked';

                if (item.type === 'lesson' && les) {
                  if (les.isCompleted) {
                    nodeIcon = (
                      <Pressable
                        style={[styles.nodeCircle, styles.nodeCircleCompleted, { left: nodeLeft, top: nodeTop, width: nodeSize, height: nodeSize }]}
                        onPress={() => handleLessonClick(les)}
                      >
                        <Text style={styles.nodeCheckText}>✓</Text>
                      </Pressable>
                    );
                  } else if (item.status === 'current') {
                    nodeIcon = (
                      <CurrentFlowerNode size={nodeSize} style={{ position: 'absolute', left: nodeLeft, top: nodeTop }}>
                        <Pressable
                          style={[styles.nodeCircle, styles.nodeCircleCurrent, { width: nodeSize, height: nodeSize }]}
                          onLayout={(e) => setActiveLessonY(e.nativeEvent.layout.y)}
                          onPress={() => handleLessonClick(les)}
                        >
                          <View style={styles.nodeCircleInnerDot} />
                        </Pressable>
                      </CurrentFlowerNode>
                    );
                  } else {
                    nodeIcon = (
                      <View style={[styles.nodeCircle, styles.nodeCircleLocked, { left: nodeLeft, top: nodeTop, width: nodeSize, height: nodeSize }]}>
                        <Ionicons name="lock-closed" size={16} color="#8E8E93" />
                      </View>
                    );
                  }
                } else if (item.type === 'module-gate') {
                  if (item.status === 'completed') {
                    nodeIcon = (
                      <View style={[styles.nodeCircle, styles.nodeCircleCompleted, { left: nodeLeft, top: nodeTop, width: nodeSize, height: nodeSize }]}>
                        <Text style={styles.nodeCheckText}>✓</Text>
                      </View>
                    );
                  } else {
                    nodeIcon = (
                      <View style={[styles.nodeCircle, styles.nodeCircleStar, { left: nodeLeft, top: nodeTop, width: nodeSize, height: nodeSize }]}>
                        <Text style={styles.nodeStarText}>⭐</Text>
                      </View>
                    );
                  }
                } else if (item.type === 'flag') {
                  nodeIcon = (
                    <View style={[styles.nodeCircle, styles.nodeCircleFlag, { left: nodeLeft, top: nodeTop, width: nodeSize, height: nodeSize }]}>
                      <Text style={styles.nodeFlagText}>🏁</Text>
                    </View>
                  );
                }

                // Text label
                const labelLeft = pathCenterX + 45;
                const labelWidth = screenWidth - labelLeft - 16;
                const isLessonCompleted = item.type === 'lesson' && les?.isCompleted;

                const labelContent = (
                  <View style={[styles.nodeLabelContainer, { left: labelLeft, top: nodeTop, height: nodeSize, width: labelWidth }]}>
                    {item.type === 'lesson' && les ? (
                      <Pressable
                        style={styles.labelPressable}
                        onPress={() => handleLessonClick(les)}
                        disabled={isLocked}
                      >
                        <Text
                          style={[
                            styles.nodeLabelText,
                            isLocked && styles.nodeLabelTextLocked,
                            isHero && styles.nodeLabelTextCurrent,
                          ]}
                          numberOfLines={1}
                        >
                          {item.displayOrder}. {les.title}
                        </Text>
                        {isLessonCompleted && (
                          <Ionicons name="checkmark-circle" size={18} color="#8DBB75" style={{ marginLeft: 6 }} />
                        )}
                        {isHero && (
                          <View style={styles.currentBadgePill}>
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        )}
                      </Pressable>
                    ) : item.type === 'module-gate' ? (
                      <View style={styles.labelPressable}>
                        <Text
                          style={[
                            styles.nodeLabelText,
                            isLocked && styles.nodeLabelTextLocked,
                            styles.nodeLabelTextGate,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.labelPressable}>
                        <Text style={[styles.nodeLabelText, styles.nodeLabelTextFlag]}>
                          Adventure End!
                        </Text>
                      </View>
                    )}
                  </View>
                );

                return (
                  <View key={item.id} style={{ height: rowHeight, width: screenWidth, position: 'relative' }}>
                    {pathSegment}
                    {nodeIcon}
                    {labelContent}
                  </View>
                );
              });
            })()}
          </View>

          {/* ENGAGING DAILY GOAL COMPLETION STATE */}
          {isTodayComplete && (
            <View style={styles.completionContainer}>
              <Text style={styles.completionEmoji}>🏆</Text>
              <Text style={styles.completionTitle}>Today's adventure complete!</Text>
              <View style={styles.rewardsRow}>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillText}>⭐ +20 XP</Text>
                </View>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillText}>🎉 +1 Sticker</Text>
                </View>
              </View>
              <Text style={styles.completionSubtitle}>See you tomorrow!</Text>
              <View style={styles.timerWrap}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.timerText}>Next unlocks in {hoursUntilMidnight}h</Text>
              </View>
            </View>
          )}

          {/* RECOMMENDED STORY SECTION */}
          {recommendation && (
            <View style={styles.recommendationBox}>
              <Text style={styles.sectionHeader}>Recommended Story</Text>
              <Pressable
                style={styles.recomCard}
                onPress={() => navigation.navigate('StoryDetail', { storyId: recommendation.id })}
              >
                <Text style={styles.recomEmoji}>📖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recomTitle}>{recommendation.title}</Text>
                  <Text style={styles.recomMeta}>{recommendation.readingLevel || 'Early Reader'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.purple} />
              </Pressable>
            </View>
          )}
        </ScrollView>

      </View>
      <NavigationGuide
        screenKey="roadmap"
        guideKey="roadmap"
        message="Welcome to PetalPath! Tap your active lesson flower to grow!"
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF9F3',
  },
  scrollView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  topBar: {
    backgroundColor: '#FFF9F3',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1E4D3',
    zIndex: 100,
    overflow: 'visible' as const,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  childTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarEmoji: {
    fontSize: 14,
  },
  activeChildName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginRight: 4,
    fontFamily: typography.families.rounded,
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    right: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
    padding: 6,
    minWidth: 140,
    ...shadows.md,
    zIndex: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
    padding: 10,
    textAlign: 'center',
    fontFamily: typography.families.rounded,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1E4D3',
    marginVertical: 4,
  },
  avatarCircleMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarEmojiMini: {
    fontSize: 12,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStatItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  headerStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStatIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  headerStatValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  headerStatLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.families.rounded,
    marginTop: -2,
  },
  floatingStreakCard: {
    position: 'absolute',
    left: 16,
    top: 20,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
    borderRadius: 18,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 72,
    ...shadows.sm,
    zIndex: 50,
  },
  floatingStreakEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  floatingStreakText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
  },
  continueCard: {
    backgroundColor: '#FFE5D9',
    borderRadius: 24,
    padding: 20,
    ...shadows.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
  },
  continueCardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  continueCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#855CF8',
    letterSpacing: 0.5,
    fontFamily: typography.families.rounded,
    marginBottom: 4,
  },
  continueTopic: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: 4,
  },
  continueLesson: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginBottom: 8,
  },
  continueRemaining: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginBottom: 12,
  },
  resumeBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    ...shadows.sm,
  },
  resumeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.purple,
    fontFamily: typography.families.rounded,
  },
  continueCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantIllustrationBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
  },
  plantIllustrationEmoji: {
    fontSize: 48,
  },
  roadmapBox: {
    position: 'relative',
    marginTop: spacing.sm,
  },
  connectorWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: -1,
  },
  nodeCircle: {
    position: 'absolute',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F1E4D3',
    backgroundColor: '#FFF',
    ...shadows.sm,
  },
  nodeCircleCompleted: {
    backgroundColor: '#EAF5E3',
    borderColor: '#8DBB75',
  },
  nodeCircleCurrent: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  nodeCircleInnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
  },
  nodeCircleLocked: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  nodeCircleStar: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD60A',
  },
  nodeCircleFlag: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF453A',
  },
  nodeCheckText: {
    color: '#8DBB75',
    fontSize: 18,
    fontWeight: '900',
  },
  nodeStarText: {
    fontSize: 18,
  },
  nodeFlagText: {
    fontSize: 18,
  },
  nodeLabelContainer: {
    position: 'absolute',
    justifyContent: 'center',
  },
  labelPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nodeLabelText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  nodeLabelTextCurrent: {
    color: colors.purple,
    fontWeight: '900',
  },
  nodeLabelTextLocked: {
    color: '#8E8E93',
    fontWeight: '600',
  },
  nodeLabelTextGate: {
    color: '#855CF8',
    fontWeight: '800',
  },
  nodeLabelTextFlag: {
    color: '#FF453A',
    fontWeight: '800',
  },
  currentBadgePill: {
    backgroundColor: '#EDE8FF',
    borderWidth: 1,
    borderColor: '#C0B3F1',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.purple,
    fontFamily: typography.families.rounded,
  },
  completionContainer: {
    backgroundColor: '#EEF9E6',
    borderWidth: 2,
    borderColor: '#C7EAB4',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  completionEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3C763D',
    textAlign: 'center',
    fontFamily: typography.families.rounded,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  rewardPill: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#C7EAB4',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rewardPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.success,
    fontFamily: typography.families.rounded,
  },
  completionSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3C763D',
    marginTop: 10,
    fontFamily: typography.families.rounded,
  },
  timerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  timerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.families.rounded,
  },
  recommendationBox: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontFamily: typography.families.rounded,
  },
  recomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
    padding: 12,
    ...shadows.sm,
  },
  recomEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  recomTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  recomMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: typography.families.rounded,
  },
  unlocksBox: {
    marginTop: spacing.lg,
  },
  carouselContainer: {
    gap: 12,
    paddingRight: spacing.md,
    paddingVertical: 4,
  },
  unlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
    padding: 12,
    minWidth: 180,
    ...shadows.sm,
  },
  unlockIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  unlockTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  unlockDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: typography.families.rounded,
  },
  floatingResume: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    ...shadows.lg,
  },
  floatingResumeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    fontFamily: typography.families.rounded,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    width: '100%',
    gap: 12,
  },
  themeHeaderDivider: {
    flex: 1,
    height: 2,
    backgroundColor: '#F1E4D3',
  },
  themeHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#855CF8',
    fontFamily: typography.families.rounded,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default HomeMobile;
