import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';

interface ContinueLearningProps {
  lessonTitle?: string;
  moduleTitle?: string;
  categoryTitle?: string;
  progress?: number;
  onResume?: () => void;
  loading?: boolean;
}

export const ContinueLearning: React.FC<ContinueLearningProps> = ({
  lessonTitle,
  moduleTitle,
  categoryTitle,
  progress,
  onResume,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Skeleton width={100} height={12} />
        <Skeleton width="80%" height={16} style={{ marginTop: spacing.sm }} />
        <Skeleton width="60%" height={12} style={{ marginTop: spacing.xs }} />
        <Skeleton width="100%" height={8} style={{ marginTop: spacing.md }} />
        <Skeleton width={110} height={40} style={{ marginTop: spacing.md }} />
      </Card>
    );
  }

  if (!lessonTitle) {
    return null;
  }

  return (
    <Card
      style={styles.card}
      accessibilityLabel={`Continue learning: ${lessonTitle}`}
    >
      <View style={styles.content}>
        <View style={styles.textSection}>
          <View style={styles.labelRow}>
            <Ionicons name="play-circle" size={16} color={colors.purple} />
            <Text style={styles.label}>Continue Learning</Text>
          </View>
          <Text style={styles.lessonTitle} numberOfLines={2}>{lessonTitle}</Text>
          {moduleTitle && (
            <Text style={styles.context} numberOfLines={1}>{moduleTitle}</Text>
          )}
          {categoryTitle && (
            <Text style={styles.contextSecondary} numberOfLines={1}>{categoryTitle}</Text>
          )}
          {typeof progress === 'number' && (
            <ProgressBar
              progress={progress}
              variant="primary"
              style={styles.progressBar}
            />
          )}
        </View>
        {onResume && (
          <Button
            label="Resume"
            onPress={onResume}
            variant="primary"
            size="sm"
            accessibilityLabel="Resume lesson"
          />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.purple,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    marginLeft: spacing.xs,
  },
  lessonTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  context: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  contextSecondary: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  progressBar: {
    marginTop: spacing.xs,
  },
});

export default ContinueLearning;
