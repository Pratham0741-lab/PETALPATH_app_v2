import React, { useEffect, useMemo, useRef, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore, Lesson } from '../../store/roadmapStore';
import { useChildStore } from '../../store/childStore';
import { useRewardsStore } from '../../store/rewardsStore';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { navigateToActivity } from '../../utils/navigationFlow';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

// -------------------------------------------------------------
// DECORATIVE BACKGROUND COMPONENTS
// -------------------------------------------------------------

const LeftHill = React.memo(({ top, width }: { top: number; width: number }) => (
  <View style={{ position: 'absolute', top, left: 0, width: width * 0.45, height: 200, zIndex: -2 }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path d="M 0 100 C 40 65, 80 75, 100 100 Z" fill="#E8F4E1" />
    </Svg>
  </View>
));

const RightHill = React.memo(({ top, width }: { top: number; width: number }) => (
  <View style={{ position: 'absolute', top, right: 0, width: width * 0.45, height: 200, zIndex: -2 }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path d="M 100 100 C 60 60, 20 70, 0 100 Z" fill="#EAF5E3" />
    </Svg>
  </View>
));

const GardenTree = React.memo(({ top, left }: { top: number; left: number }) => (
  <View style={{ position: 'absolute', top, left, width: 45, height: 55, zIndex: -2 }}>
    <Svg width="45" height="55" viewBox="0 0 45 55">
      <Rect x="20" y="32" width="5" height="23" rx="1.5" fill="#8C6F5A" />
      <Circle cx="22" cy="20" r="17" fill="#8DBB75" />
      <Circle cx="15" cy="15" r="9" fill="#9CD184" />
      <Circle cx="16" cy="13" r="3" fill="#F6B5C5" />
      <Circle cx="28" cy="22" r="3" fill="#F6B5C5" />
    </Svg>
  </View>
));

const GardenBush = React.memo(({ top, left }: { top: number; left: number }) => (
  <View style={{ position: 'absolute', top, left, width: 40, height: 25, zIndex: -2 }}>
    <Svg width="40" height="25" viewBox="0 0 40 25">
      <Path d="M 4 25 C 0 8, 14 4, 20 14 C 26 4, 40 8, 36 25 Z" fill="#9CD184" />
      <Circle cx="12" cy="16" r="2" fill="#FFF" />
      <Circle cx="25" cy="13" r="2" fill="#FFF" />
    </Svg>
  </View>
));

const TinyFlower = React.memo(({ top, left, color = '#F6B5C5' }: { top: number; left: number; color?: string }) => (
  <View style={{ position: 'absolute', top, left, width: 16, height: 20, zIndex: -2 }}>
    <Svg width="16" height="20" viewBox="0 0 16 20">
      <Path d="M8 9 L8 20" stroke="#7CA767" strokeWidth="1.5" />
      <Circle cx="8" cy="7" r="4" fill={color} />
      <Circle cx="4" cy="7" r="3" fill={color} />
      <Circle cx="12" cy="7" r="3" fill={color} />
      <Circle cx="8" cy="3" r="3" fill={color} />
      <Circle cx="8" cy="7" r="1.5" fill="#F7C94B" />
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
    outputRange: [0, 15, 0],
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
        width: 14,
        height: 8,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
        zIndex: -1,
      }}
    >
      <Svg width="14" height="8" viewBox="0 0 14 8">
        <Path d="M 0 4 C 3 0, 11 0, 14 4 C 11 8, 3 8, 0 4 Z" fill="#F6B5C5" opacity={0.8} />
      </Svg>
    </Animated.View>
  );
});

// -------------------------------------------------------------
// FLOWER NODE ANIMATION WRAPPERS
// -------------------------------------------------------------

const CurrentFlowerNode = ({ size, children }: { size: number; children: React.ReactNode }) => {
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
    outputRange: [0.97, 1.03],
  });

  const glowOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 20,
          height: size + 20,
          borderRadius: (size + 20) / 2,
          borderWidth: 3,
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
interface PathNode {
  type: 'lesson' | 'milestone' | 'reward';
  id: string;
  title: string;
  status: 'completed' | 'current' | 'locked';
  lesson?: Lesson;
  moduleTitle?: string;
  categoryTitle?: string;
}

const PathRowItem = React.memo(({
  item,
  index,
  layout,
  nextLayout,
  isFirst,
  isLast,
  screenWidth,
  pathCenterX,
  handleLessonClick,
  handlePlayContinue,
  navigation,
}: {
  item: PathNode;
  index: number;
  layout: { x: number; height: number };
  nextLayout?: { x: number; height: number };
  isFirst: boolean;
  isLast: boolean;
  screenWidth: number;
  pathCenterX: number;
  handleLessonClick: (lesson: Lesson) => void;
  handlePlayContinue: () => void;
  navigation: any;
}) => {
  const isHero = item.status === 'current' && item.type === 'lesson';
  const flowerSize = isHero ? 90 : (item.type === 'milestone' ? 80 : (item.type === 'reward' ? 72 : 56));
  const cardMarginLeft = 12;
  const flowerLeft = pathCenterX + layout.x - flowerSize / 2;
  const rowHeight = layout.height;

  // Render path segment connecting this row center to next row center
  let pathSegment = null;
  if (!isLast && nextLayout) {
    const segmentHeight = rowHeight / 2 + nextLayout.height / 2;
    const startX = pathCenterX + layout.x;
    const endX = pathCenterX + nextLayout.x;
    const midY = segmentHeight / 2;
    const d = `M ${startX} 0 C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${segmentHeight}`;

    pathSegment = (
      <View
        style={{
          position: 'absolute',
          top: rowHeight / 2,
          left: 0,
          width: screenWidth,
          height: segmentHeight,
          zIndex: -1,
        }}
        pointerEvents="none"
      >
        <Svg width={screenWidth} height={segmentHeight}>
          <Path
            d={d}
            stroke="#FFE5D9"
            strokeWidth={28}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
          <Path
            d={d}
            stroke="#D6BCFA"
            strokeWidth={3}
            strokeDasharray="6, 8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }

  // Render intro straight path segment (only for the very first item)
  let introSegment = null;
  if (isFirst) {
    introSegment = (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: screenWidth,
          height: rowHeight / 2,
          zIndex: -1,
        }}
        pointerEvents="none"
      >
        <Svg width={screenWidth} height={rowHeight / 2}>
          <Path
            d={`M ${pathCenterX + layout.x} 0 L ${pathCenterX + layout.x} ${rowHeight / 2}`}
            stroke="#FFE5D9"
            strokeWidth={28}
            fill="none"
            strokeLinecap="round"
            opacity={0.9}
          />
          <Path
            d={`M ${pathCenterX + layout.x} 0 L ${pathCenterX + layout.x} ${rowHeight / 2}`}
            stroke="#D6BCFA"
            strokeWidth={3}
            strokeDasharray="6, 8"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  // Render outro straight path segment (only for the very last item)
  let outroSegment = null;
  if (isLast) {
    outroSegment = (
      <View
        style={{
          position: 'absolute',
          top: rowHeight / 2,
          left: 0,
          width: screenWidth,
          height: 100,
          zIndex: -1,
        }}
        pointerEvents="none"
      >
        <Svg width={screenWidth} height={100}>
          <Path
            d={`M ${pathCenterX + layout.x} 0 L ${pathCenterX + layout.x} 100`}
            stroke="#FFE5D9"
            strokeWidth={28}
            fill="none"
            strokeLinecap="round"
            opacity={0.9}
          />
          <Path
            d={`M ${pathCenterX + layout.x} 0 L ${pathCenterX + layout.x} 100`}
            stroke="#D6BCFA"
            strokeWidth={3}
            strokeDasharray="6, 8"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  // Render background landscapes matching index (decided deterministically)
  let rowDecoration = null;
  const hillTop = -20;
  if (index % 3 === 0) {
    rowDecoration = (
      <>
        <LeftHill top={hillTop} width={screenWidth} />
        <GardenTree top={hillTop + 40} left={20} />
        <TinyFlower top={hillTop + 110} left={65} color="#F6B5C5" />
        <TinyFlower top={hillTop + 130} left={85} color="#B89DE8" />
        <FloatingPetal top={hillTop + 20} left={pathCenterX + 20} delay={index * 300} />
      </>
    );
  } else if (index % 3 === 1) {
    rowDecoration = (
      <>
        <RightHill top={hillTop} width={screenWidth} />
        <GardenBush top={hillTop + 50} left={screenWidth - 70} />
        <TinyFlower top={hillTop + 100} left={screenWidth - 90} color="#F29A8F" />
        <FloatingPetal top={hillTop + 150} left={pathCenterX - 30} delay={index * 300} />
      </>
    );
  } else {
    rowDecoration = (
      <>
        <FloatingPetal top={hillTop + 50} left={pathCenterX + 40} delay={index * 200} />
      </>
    );
  }

  const flowerElement = (
    <View style={{ width: flowerSize, height: flowerSize, alignItems: 'center', justifyContent: 'center' }}>
      {item.type === 'lesson' && item.status === 'completed' && (
        <CompletedFlowerNode size={flowerSize} onPress={() => item.lesson && handleLessonClick(item.lesson)}>
          <Svg viewBox="0 0 100 100" width="100%" height="100%">
            <Path d="M50 70 L50 95" stroke="#7CA767" strokeWidth="6" strokeLinecap="round" />
            <Path d="M50 80 Q35 75 40 70" stroke="#7CA767" strokeWidth="5" strokeLinecap="round" fill="none" />
            <Path d="M50 85 Q65 80 60 75" stroke="#7CA767" strokeWidth="5" strokeLinecap="round" fill="none" />
            <Circle cx="50" cy="30" r="16" fill="#F6B5C5" />
            <Circle cx="30" cy="45" r="16" fill="#F6B5C5" />
            <Circle cx="70" cy="45" r="16" fill="#F6B5C5" />
            <Circle cx="38" cy="65" r="16" fill="#F6B5C5" />
            <Circle cx="62" cy="65" r="16" fill="#F6B5C5" />
            <Circle cx="50" cy="50" r="18" fill="#FFF" />
            <Circle cx="50" cy="50" r="14" fill="#8DBB75" />
            <Path d="M43 50 L48 55 L58 45" stroke="#FFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </CompletedFlowerNode>
      )}

      {item.type === 'lesson' && item.status === 'current' && (
        <CurrentFlowerNode size={flowerSize}>
          <Pressable onPress={handlePlayContinue} style={{ width: '100%', height: '100%' }}>
            <Svg viewBox="0 0 100 100" width="100%" height="100%">
              <Path d="M50 70 L50 95" stroke="#7CA767" strokeWidth="8" strokeLinecap="round" />
              <Path d="M50 80 Q30 75 35 68" stroke="#7CA767" strokeWidth="6" strokeLinecap="round" fill="none" />
              <Path d="M50 85 Q70 80 65 73" stroke="#7CA767" strokeWidth="6" strokeLinecap="round" fill="none" />
              <Circle cx="50" cy="26" r="20" fill="#8B78D8" />
              <Circle cx="26" cy="44" r="20" fill="#8B78D8" />
              <Circle cx="74" cy="44" r="20" fill="#8B78D8" />
              <Circle cx="35" cy="68" r="20" fill="#8B78D8" />
              <Circle cx="65" cy="68" r="20" fill="#8B78D8" />
              <Circle cx="50" cy="50" r="22" fill="#F7C94B" />
              <Circle cx="50" cy="50" r="16" fill="#FAD875" />
            </Svg>
          </Pressable>
        </CurrentFlowerNode>
      )}

      {item.type === 'lesson' && item.status === 'locked' && (
        <View style={{ width: flowerSize, height: flowerSize, opacity: 0.7 }}>
          <Svg viewBox="0 0 100 100" width="100%" height="100%">
            <Path d="M50 70 L50 95" stroke="#C7C7CC" strokeWidth="6" strokeLinecap="round" />
            <Circle cx="50" cy="30" r="16" fill="#E5E5EA" />
            <Circle cx="34" cy="46" r="16" fill="#E5E5EA" />
            <Circle cx="66" cy="46" r="16" fill="#E5E5EA" />
            <Circle cx="40" cy="66" r="16" fill="#E5E5EA" />
            <Circle cx="60" cy="66" r="16" fill="#E5E5EA" />
            <Circle cx="50" cy="50" r="18" fill="#D1D1D6" />
            <Rect x="42" y="48" width="16" height="12" rx="2" fill="#8E8E93" />
            <Path d="M46 48 V43 A4 4 0 0 1 54 43 V48" stroke="#8E8E93" strokeWidth="2.5" fill="none" />
          </Svg>
        </View>
      )}

      {item.type === 'milestone' && (
        <Pressable
          onPress={() => item.status !== 'locked' && navigation.navigate('Rewards')}
          style={{ width: flowerSize, height: flowerSize, opacity: item.status === 'locked' ? 0.6 : 1 }}
        >
          <Svg viewBox="0 0 100 100" width="100%" height="100%">
            <Path d="M50 70 L50 95" stroke={item.status === 'locked' ? '#C7C7CC' : '#7CA767'} strokeWidth="7" strokeLinecap="round" />
            <Circle cx="50" cy="48" r="30" fill={item.status === 'locked' ? '#E5E5EA' : '#FFF3D6'} stroke={item.status === 'locked' ? '#F7C94B' : '#F7C94B'} strokeWidth="2" />
            <Path d="M50 28 L55 39 L67 41 L58 49 L61 61 L50 55 L39 61 L42 49 L33 41 L45 39 Z" fill={item.status === 'locked' ? '#8E8E93' : '#F7C94B'} />
          </Svg>
        </Pressable>
      )}

      {item.type === 'reward' && (
        <Pressable
          onPress={() => item.status !== 'locked' && navigation.navigate('Rewards')}
          style={{ width: flowerSize, height: flowerSize, opacity: item.status === 'locked' ? 0.6 : 1 }}
        >
          <Svg viewBox="0 0 100 100" width="100%" height="100%">
            <Path d="M50 70 L50 95" stroke={item.status === 'locked' ? '#C7C7CC' : '#7CA767'} strokeWidth="6" strokeLinecap="round" />
            <Circle cx="50" cy="48" r="28" fill={item.status === 'locked' ? '#E5E5EA' : '#FFF2F5'} stroke={item.status === 'locked' ? '#D1D1D6' : '#F6B5C5'} strokeWidth="2.5" />
            <Rect x="36" y="38" width="28" height="24" rx="2" fill={item.status === 'locked' ? '#8E8E93' : '#F6B5C5'} />
            <Rect x="34" y="34" width="32" height="6" rx="1" fill={item.status === 'locked' ? '#AEAEB2' : '#F29A8F'} />
            <Rect x="47" y="34" width="6" height="28" fill="#FFF" />
          </Svg>
        </Pressable>
      )}
    </View>
  );

  const cardElement = (
    <View style={styles.cardWrapper}>
      {isHero ? (
        <Pressable
          onPress={handlePlayContinue}
          style={[
            styles.currentLessonCard,
            { borderColor: colors.purple, borderWidth: 2 },
          ]}
        >
          <View style={styles.currentCardContent}>
            <Text style={[styles.cardTitle, styles.boldText]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.currentCardSubtext, { fontFamily: typography.families.rounded }]} numberOfLines={1}>
              Current Lesson
            </Text>
          </View>

          <View style={styles.continueButton}>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => item.type === 'lesson' && item.lesson && handleLessonClick(item.lesson)}
          disabled={item.status === 'locked'}
          style={[
            styles.normalLessonCard,
            { opacity: item.status === 'locked' ? 0.75 : 1 },
          ]}
        >
          <View style={styles.normalCardContent}>
            <Text style={[styles.cardTitle, { color: item.status === 'locked' ? '#8F8A82' : colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>

            {item.status === 'completed' && (
              <View style={styles.completedBadgeRow}>
                <Text style={[styles.completedBadgeText, { fontFamily: typography.families.rounded }]}>
                  Completed
                </Text>
                <Text style={styles.starText}>⭐</Text>
              </View>
            )}

            {item.status === 'locked' && (
              <Text style={[styles.lockedCardSubtext, { fontFamily: typography.families.rounded }]}>
                Locked
              </Text>
            )}

            {item.type === 'milestone' && (
              <Text style={[styles.milestoneSubtext, { fontFamily: typography.families.rounded, color: item.status === 'locked' ? '#8F8A82' : colors.purple }]}>
                {item.status === 'completed' ? 'Milestone Complete!' : 'Milestone'}
              </Text>
            )}

            {item.type === 'reward' && (
              <Text style={[styles.rewardSubtext, { fontFamily: typography.families.rounded, color: item.status === 'locked' ? '#8F8A82' : colors.coral }]}>
                {item.status === 'completed' ? 'Reward Claimed!' : 'Special Reward!'}
              </Text>
            )}
          </View>
        </Pressable>
      )}
    </View>
  );

  const isCardOnLeft = layout.x >= 0;

  return (
    <View style={{ height: rowHeight, position: 'relative', width: screenWidth }}>
      {rowDecoration}
      {introSegment}
      {pathSegment}
      {outroSegment}

      <View style={[styles.nodeRow, { position: 'relative', height: rowHeight, width: screenWidth, flexDirection: 'row' }]}>
        {isCardOnLeft ? (
          <>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', paddingRight: cardMarginLeft }}>
              {cardElement}
            </View>
            {flowerElement}
            <View style={{ width: Math.max(0, screenWidth - flowerLeft - flowerSize) }} />
          </>
        ) : (
          <>
            <View style={{ width: flowerLeft }} />
            {flowerElement}
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: cardMarginLeft }}>
              {cardElement}
            </View>
          </>
        )}
      </View>
    </View>
  );
});

export const HomeTablet: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const flatListRef = useRef<FlatList>(null);

  const {
    categories,
    currentLesson,
    loading: roadmapLoading,
    loadRoadmap,
    selectLesson,
    isLessonUnlocked,
  } = useRoadmapStore();

  const {
    totalStars,
    refreshRewards,
  } = useRewardsStore();

  useEffect(() => {
    loadRoadmap();
    refreshRewards();
  }, []);

  // 1. Flatten path items
  const pathNodes = useMemo<PathNode[]>(() => {
    const nodes: PathNode[] = [];
    if (!categories || categories.length === 0) return nodes;

    categories.forEach((cat) => {
      cat.modules.forEach((mod) => {
        mod.lessons.forEach((les) => {
          let status: 'completed' | 'current' | 'locked' = 'locked';
          if (les.isCompleted) {
            status = 'completed';
          } else if (currentLesson && les.id === currentLesson.id) {
            status = 'current';
          } else if (les.isUnlocked) {
            status = les.id === currentLesson?.id ? 'current' : 'locked';
          }
          nodes.push({
            type: 'lesson',
            id: les.id,
            title: les.title,
            status,
            lesson: les,
          });
        });

        // Milestone
        const isModCompleted = mod.lessons.every((l) => l.isCompleted);
        const isModUnlocked = mod.lessons.some((l) => l.isUnlocked || l.isCompleted);
        nodes.push({
          type: 'milestone',
          id: `milestone-${mod.id}`,
          title: `${mod.title} Milestone`,
          status: isModCompleted ? 'completed' : (isModUnlocked && !isModCompleted ? 'current' : 'locked'),
          moduleTitle: mod.title,
        });
      });

      // Reward
      const isCatCompleted = cat.isCompleted;
      const isCatUnlocked = cat.isUnlocked;
      nodes.push({
        type: 'reward',
        id: `reward-${cat.id}`,
        title: `${cat.title} Reward`,
        status: isCatCompleted ? 'completed' : (isCatUnlocked && !isCatCompleted ? 'current' : 'locked'),
        categoryTitle: cat.title,
      });
    });

    return nodes;
  }, [categories, currentLesson]);

  // Dimensions
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 680); // Center with max width on large screens
  const leftOffset = (windowWidth - screenWidth) / 2;

  // 2. Pre-calculate horizontal offsets and heights of nodes
  const nodeLayouts = useMemo(() => {
    return pathNodes.map((item, index) => {
      const isHero = item.status === 'current' && item.type === 'lesson';
      const height = isHero ? 190 : 120;
      const x = Math.sin(index * 1.25) * 25; // sine curve offset
      return { x, height };
    });
  }, [pathNodes]);

  // Center path in the middle of the viewport width
  const pathCenterX = screenWidth * 0.5;

  // 3. Auto-scroll to center current active lesson index
  useEffect(() => {
    if (currentLesson && pathNodes.length > 0) {
      const currentIndex = pathNodes.findIndex((n) => n.type === 'lesson' && n.id === currentLesson.id);
      if (currentIndex !== -1) {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: currentIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentLesson, pathNodes]);

  const handlePlayContinue = useCallback(async () => {
    if (!currentLesson) return;
    await selectLesson(currentLesson);
    
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
  }, [currentLesson, selectLesson, navigation]);

  const handleLessonClick = useCallback(async (lesson: Lesson) => {
    if (isLessonUnlocked(lesson.id)) {
      await selectLesson(lesson);
      navigation.navigate('LessonOverview');
    }
  }, [isLessonUnlocked, selectLesson, navigation]);

  const getItemLayout = (data: any, index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const item = data[i];
      const isHero = item.status === 'current' && item.type === 'lesson';
      offset += isHero ? 190 : 120;
    }
    const item = data[index];
    const isHero = item?.status === 'current' && item?.type === 'lesson';
    const length = isHero ? 190 : 120;
    return { length, offset, index };
  };

  const childName = activeChild?.name || 'Explorer';

  const renderItem = useCallback(({ item, index }: { item: PathNode; index: number }) => {
    return (
      <PathRowItem
        item={item}
        index={index}
        layout={nodeLayouts[index]}
        nextLayout={nodeLayouts[index + 1]}
        isFirst={index === 0}
        isLast={index === pathNodes.length - 1}
        screenWidth={screenWidth}
        pathCenterX={pathCenterX}
        handleLessonClick={handleLessonClick}
        handlePlayContinue={handlePlayContinue}
        navigation={navigation}
      />
    );
  }, [nodeLayouts, pathNodes.length, screenWidth, pathCenterX, handleLessonClick, handlePlayContinue, navigation]);

  return (
    <ScreenContainer>
      <View style={styles.root}>
        {/* CUSTOM TOP BAR (Centered on Tablet View) */}
        <View style={styles.topBar}>
          <View style={[styles.topBarCentered, { width: screenWidth }]}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>
                <Text style={{ color: '#F6B5C5' }}>🌸 </Text>
                <Text style={{ color: '#855CF8' }}>PetalPath</Text>
              </Text>
            </View>

            <View style={styles.headerRow}>
              <View style={styles.greetingSection}>
                <Text style={[styles.greetingText, { fontFamily: typography.families.rounded }]}>
                  Hi {childName} 🌸
                </Text>
                <Text style={[styles.greetingSubtext, { fontFamily: typography.families.rounded }]}>
                  Let's keep growing today!
                </Text>
              </View>
              
              <View style={styles.starPill}>
                <Text style={[styles.starPillText, { fontFamily: typography.families.rounded }]}>
                  {totalStars} ⭐
                </Text>
              </View>
            </View>
          </View>
        </View>

        {roadmapLoading && pathNodes.length === 0 ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={[styles.centeredContainer, { width: screenWidth }]}>
              <FlatList
                ref={flatListRef}
                data={pathNodes}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                getItemLayout={getItemLayout}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={6}
                windowSize={5}
                initialNumToRender={8}
              />
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF9F3',
  },
  topBar: {
    backgroundColor: '#FFF9F3',
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1E4D3',
    alignItems: 'center',
    paddingVertical: 15,
    zIndex: 10,
  },
  topBarCentered: {
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingSection: {
    flex: 1.2,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3B342F',
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#7A726C',
    marginTop: 2,
  },
  starPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  starPillText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B78D8',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContainer: {
    flex: 1,
    alignSelf: 'center',
    position: 'relative',
  },
  nodeRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
  },
  cardWrapper: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  currentLessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 140,
    maxWidth: 360,
    ...shadows.md,
  },
  currentCardContent: {
    flexShrink: 1,
    marginRight: 8,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3B342F',
  },
  boldText: {
    fontSize: 19,
    fontWeight: '900',
  },
  currentCardSubtext: {
    fontSize: 14,
    color: '#8B78D8',
    fontWeight: '700',
  },
  continueButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B78D8',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  normalLessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#F1E4D3',
    minWidth: 140,
    maxWidth: 360,
    ...shadows.sm,
  },
  normalCardContent: {
    gap: 3,
    flexShrink: 1,
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 13,
    color: '#8DBB75',
    fontWeight: '700',
  },
  starText: {
    fontSize: 12,
  },
  lockedCardSubtext: {
    fontSize: 13,
    color: '#8F8A82',
    fontWeight: '600',
  },
  milestoneSubtext: {
    fontSize: 13,
    fontWeight: '700',
  },
  rewardSubtext: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default HomeTablet;
