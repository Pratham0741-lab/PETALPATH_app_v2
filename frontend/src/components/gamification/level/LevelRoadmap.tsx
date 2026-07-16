import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { LevelMilestone } from './LevelMilestone';

interface RoadmapMilestone {
  level: number;
  label: string;
  reward: string;
  requiredXP: number;
}

interface LevelRoadmapProps {
  milestones: RoadmapMilestone[];
  currentLevel: number;
  style?: StyleProp<ViewStyle>;
}

export const LevelRoadmap: React.FC<LevelRoadmapProps> = ({
  milestones,
  currentLevel,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.heading}>Level Roadmap</Text>
      <View style={styles.list}>
        {milestones.map((milestone) => (
          <LevelMilestone
            key={milestone.level}
            milestone={milestone}
            reached={milestone.level <= currentLevel}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  heading: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    color: colors.text,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
});
