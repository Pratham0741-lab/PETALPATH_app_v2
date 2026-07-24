import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../theme';

interface RepetitionCounterProps {
  currentReps: number;
  targetReps: number;
}

export const RepetitionCounter: React.FC<RepetitionCounterProps> = ({
  currentReps,
  targetReps,
}) => {
  if (targetReps <= 1) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Reps: {currentReps}/{targetReps}</Text>
      <View style={styles.starsRow}>
        {Array.from({ length: targetReps }).map((_, idx) => {
          const isDone = idx < currentReps;
          return (
            <Ionicons
              key={idx}
              name={isDone ? 'star' : 'star-outline'}
              size={24}
              color={isDone ? '#FFD700' : 'rgba(255, 255, 255, 0.4)'}
              style={styles.starIcon}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginHorizontal: 3,
  },
});
