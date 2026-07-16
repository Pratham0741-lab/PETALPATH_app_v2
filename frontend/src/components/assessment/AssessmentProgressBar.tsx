import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  progress: number;
  answeredCount: number;
  totalCount: number;
  color?: string;
}

export const AssessmentProgressBar: React.FC<Props> = ({
  progress,
  answeredCount,
  totalCount,
  color = colors.primary,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={styles.container}>
      <View style={styles.barOuter}>
        <View
          style={[
            styles.barInner,
            { width: `${clampedProgress}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.label}>
        {answeredCount}/{totalCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  barOuter: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  barInner: {
    height: '100%',
    borderRadius: 6,
  },
  label: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
});

export default AssessmentProgressBar;
