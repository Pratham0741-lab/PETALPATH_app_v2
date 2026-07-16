import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';

interface SkillMasteryCardProps {
  skills: Array<{ name: string; score: number; state: string }>;
  loading?: boolean;
  maxItems?: number;
  style?: ViewStyle;
}

const STATE_COLORS: Record<string, string> = {
  mastered: '#8DBB75',
  in_progress: '#5D8FD7',
  needs_practice: '#F2A15F',
  locked: '#A09A95',
};

export function SkillMasteryCard({
  skills,
  loading = false,
  maxItems = 5,
  style,
}: SkillMasteryCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading skill mastery">
        <Skeleton width={110} height={22} style={{ marginBottom: spacing.md }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ marginBottom: spacing.sm }}>
            <Skeleton width="100%" height={14} style={{ marginBottom: spacing.xs }} />
            <Skeleton variant="rect" width="100%" height={8} style={{ borderRadius: radius.xs }} />
          </View>
        ))}
      </Card>
    );
  }

  const visibleSkills = skills.slice(0, maxItems);
  const hasMore = skills.length > maxItems;

  return (
    <Card
      style={style}
      accessibilityLabel={`Skill mastery: ${skills.length} skills, ${skills.filter((s) => s.state === 'mastered').length} mastered`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Skill Mastery</Text>
      {visibleSkills.map((skill) => {
        const barColor = STATE_COLORS[skill.state] ?? themeColors.textMuted;
        return (
          <View key={skill.name} style={styles.skillRow}>
            <View style={styles.skillHeader}>
              <Text style={[styles.skillName, { color: themeColors.text }]}>{skill.name}</Text>
              <Text style={[styles.skillScore, { color: barColor }]}>{Math.round(skill.score)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: themeColors.surfaceSecondary }]}>
              <View style={[styles.progressFill, { width: `${skill.score}%`, backgroundColor: barColor }]} />
            </View>
          </View>
        );
      })}
      {hasMore && (
        <Text style={[styles.viewAll, { color: themeColors.textLink }]}>View All</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  skillRow: {
    marginBottom: spacing.sm,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  skillName: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  skillScore: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  viewAll: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default SkillMasteryCard;
