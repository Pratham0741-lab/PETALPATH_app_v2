import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { Skeleton } from '../ui/Skeleton';
import type { MasteryData } from '../../services/api/intelligenceApi';

interface SkillGraphProps {
  skills: MasteryData[];
  onSkillPress?: (skillId: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

interface Section {
  title: string;
  data: MasteryData[];
}

const STATE_CONFIG: Record<MasteryData['masteryState'], { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  locked: { label: 'Locked', icon: 'lock-closed' },
  in_progress: { label: 'In Progress', icon: 'time' },
  mastered: { label: 'Mastered', icon: 'checkmark-circle' },
  review: { label: 'Review', icon: 'refresh' },
};

const STATE_COLOR_KEY: Record<MasteryData['masteryState'], string> = {
  locked: 'textMuted',
  in_progress: 'blue',
  mastered: 'success',
  review: 'warning',
};

const AnimatedProgressFill: React.FC<{ score: number; delay: number; color: string }> = ({ score, delay, color }) => {
  const barWidth = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(score / 100, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
  }, [score, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: progress.value * barWidth.value,
  }));

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      if (barWidth.value === 0) {
        barWidth.value = e.nativeEvent.layout.width;
      }
    },
    [],
  );

  return (
    <View style={progressStyles.track} onLayout={handleLayout}>
      <Animated.View
        style={[progressStyles.fill, { backgroundColor: color }, animatedStyle]}
      />
    </View>
  );
};

const SkillItem: React.FC<{
  skill: MasteryData;
  index: number;
  onPress?: (skillId: string) => void;
  colors: Record<string, string>;
}> = ({ skill, index, onPress, colors: themeColors }) => {
  const stateConfig = STATE_CONFIG[skill.masteryState];
  const stateColorKey = STATE_COLOR_KEY[skill.masteryState];
  const stateColor = themeColors[stateColorKey];

  return (
    <Pressable
      onPress={onPress ? () => onPress(skill.skillId) : undefined}
      style={({ pressed }) => [
        skillStyles.container,
        pressed && skillStyles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${skill.skillName}, ${Math.round(skill.masteryScore)} percent mastery, ${stateConfig.label.toLowerCase()}`}
    >
      <View style={skillStyles.topRow}>
        <Text style={[skillStyles.name, { color: themeColors.text }]} numberOfLines={1}>
          {skill.skillName}
        </Text>
        <View style={[skillStyles.badge, { backgroundColor: `${stateColor}20` }]}>
          <Ionicons name={stateConfig.icon} size={12} color={stateColor} />
          <Text style={[skillStyles.badgeText, { color: stateColor }]}>
            {stateConfig.label}
          </Text>
        </View>
      </View>

      <View style={skillStyles.progressRow}>
        <View style={skillStyles.barContainer}>
          <AnimatedProgressFill
            score={skill.masteryScore}
            delay={index * 50}
            color={stateColor}
          />
        </View>
        <Text style={[skillStyles.score, { color: themeColors.textSecondary }]}>
          {Math.round(skill.masteryScore)}%
        </Text>
      </View>

      {skill.dependencies && skill.dependencies.length > 0 && (
        <View style={skillStyles.dependencyRow} accessibilityLabel={`${skill.dependencies.length} dependencies`}>
          <Ionicons name="git-branch-outline" size={12} color={themeColors.textMuted} />
          {skill.dependencies.map((dep, i) => (
            <View key={dep} style={skillStyles.depDot}>
              <View style={[skillStyles.dot, { backgroundColor: themeColors.textMuted }]} />
              {i < skill.dependencies.length - 1 && (
                <View style={[skillStyles.dotLine, { backgroundColor: themeColors.border }]} />
              )}
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
};

const SkeletonItem: React.FC = () => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.topRow}>
      <Skeleton variant="text" width="55%" height={16} />
      <Skeleton variant="rect" width={80} height={22} borderRadius={radius.chip} />
    </View>
    <View style={skeletonStyles.barRow}>
      <Skeleton variant="rect" width="100%" height={8} borderRadius={radius.progress} />
    </View>
  </View>
);

export const SkillGraph: React.FC<SkillGraphProps> = ({
  skills,
  onSkillPress,
  loading = false,
  onRefresh,
  refreshing = false,
}) => {
  const { theme } = useTheme();
  const { colors: themeColors } = theme;

  const sections = useMemo<Section[]>(() => {
    const grouped: Record<string, MasteryData[]> = {};
    for (const skill of skills) {
      if (!grouped[skill.domain]) {
        grouped[skill.domain] = [];
      }
      grouped[skill.domain].push(skill);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [skills]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={[sectionStyles.header, { borderBottomColor: themeColors.borderLight }]}>
        <Text
          style={[sectionStyles.title, { color: themeColors.textSecondary }]}
          accessibilityRole="header"
        >
          {section.title}
        </Text>
        <Text style={[sectionStyles.count, { color: themeColors.textMuted }]}>
          {section.data.length}
        </Text>
      </View>
    ),
    [themeColors],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MasteryData; index: number }) => (
      <SkillItem skill={item} index={index} onPress={onSkillPress} colors={themeColors} />
    ),
    [onSkillPress, themeColors],
  );

  const keyExtractor = useCallback((item: MasteryData) => item.skillId, []);

  if (loading && skills.length === 0) {
    return (
      <View style={[containerStyles.list, { backgroundColor: themeColors.background }]}>
        <View style={containerStyles.skeletonSection}>
          <Skeleton variant="text" width={120} height={18} />
        </View>
        <SkeletonItem />
        <SkeletonItem />
        <View style={containerStyles.skeletonSection}>
          <Skeleton variant="text" width={100} height={18} />
        </View>
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={[containerStyles.empty, { backgroundColor: themeColors.background }]}>
        <Ionicons name="analytics-outline" size={48} color={themeColors.textMuted} />
        <Text style={[containerStyles.emptyText, { color: themeColors.textSecondary }]}>
          No mastery data available
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderItem}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={containerStyles.list}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        ) : undefined
      }
      accessibilityLabel="Skill mastery graph"
      accessibilityRole="list"
    />
  );
};

const skeletonStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  barRow: {
    marginTop: spacing.xs,
  },
});

const progressStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.progress,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.progress,
  },
});

const skillStyles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barContainer: {
    flex: 1,
    height: 8,
    borderRadius: radius.progress,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  score: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    minWidth: 36,
    textAlign: 'right',
  },
  dependencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  depDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotLine: {
    width: 8,
    height: 1,
    marginHorizontal: 1,
  },
});

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  count: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.rounded,
  },
});

const containerStyles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xxl,
  },
  skeletonSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.families.rounded,
  },
});

export default SkillGraph;
