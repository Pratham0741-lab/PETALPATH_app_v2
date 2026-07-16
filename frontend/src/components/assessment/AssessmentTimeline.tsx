import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  assessments: Array<{
    id: string;
    title: string;
    date: string;
    score?: number | null;
    maxScore?: number | null;
    status: string;
  }>;
}

const dotColors: Record<string, string> = {
  completed: colors.green,
  in_progress: colors.blue,
  not_started: colors.textMuted,
};

const statusIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  completed: 'checkmark-circle',
  in_progress: 'time',
  not_started: 'ellipse-outline',
};

export const AssessmentTimeline: React.FC<Props> = ({ assessments }) => {
  return (
    <View style={styles.container}>
      {assessments.map((item, index) => {
        const isLast = index === assessments.length - 1;
        const dotColor = dotColors[item.status] || colors.textMuted;
        const iconName = statusIcons[item.status] || 'ellipse-outline';

        return (
          <View key={item.id} style={styles.entry}>
            <View style={styles.lineColumn}>
              <View style={[styles.dot, { backgroundColor: dotColor }]}>
                <Ionicons name={iconName} size={12} color={colors.white} />
              </View>
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.date}>{item.date}</Text>
              {item.score != null && item.maxScore != null ? (
                <Text style={styles.score}>
                  Score: {item.score}/{item.maxScore}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: spacing.sm,
  },
  entry: {
    flexDirection: 'row',
  },
  lineColumn: {
    alignItems: 'center',
    width: 28,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.divider,
    marginVertical: -spacing.xs,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  score: {
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});

export default AssessmentTimeline;
