import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

interface StepIndicatorProps {
  steps: number;
  currentStep: number;
  labels?: string[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  labels,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep} of ${steps}`}
      accessibilityValue={{ now: currentStep, min: 1, max: steps }}
    >
      <View style={styles.stepsRow}>
        {Array.from({ length: steps }, (_, i) => {
          const stepNumber = i + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isFuture = stepNumber > currentStep;

          return (
            <React.Fragment key={i}>
              <View style={styles.stepWrapper}>
                <View
                  style={[
                    styles.dot,
                    isCompleted && { backgroundColor: colors.success, borderColor: colors.success },
                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    isFuture && { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  accessibilityLabel={
                    labels
                      ? `${labels[i]}: ${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`
                      : `Step ${stepNumber}: ${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`
                  }
                >
                  {isCompleted ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.dotNumber,
                        { color: isFuture ? colors.textMuted : colors.textInverse },
                      ]}
                    >
                      {stepNumber}
                    </Text>
                  )}
                </View>
              </View>
              {i < steps - 1 ? (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: stepNumber <= currentStep - 1 ? colors.success : colors.border,
                    },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
      {labels ? (
        <View style={styles.labelsRow}>
          {labels.map((label, i) => (
            <Text
              key={i}
              style={[
                styles.label,
                {
                  color: i + 1 === currentStep
                    ? colors.primary
                    : i + 1 < currentStep
                    ? colors.success
                    : colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dotNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: spacing.xs,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    flex: 1,
  },
});

export default StepIndicator;
