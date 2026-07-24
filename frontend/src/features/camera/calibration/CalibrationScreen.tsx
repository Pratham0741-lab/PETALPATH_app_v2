import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { useCalibration } from './useCalibration';
import { colors, radius, spacing, typography } from '../../../theme';

export const CalibrationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { saveCalibration, profile } = useCalibration();
  const [step, setStep] = useState<number>(1);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      await saveCalibration();
      if (navigation.canGoBack()) navigation.goBack();
    }
  };

  const handleSkip = async () => {
    await saveCalibration();
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Quick Camera Calibration" showBack />

      <View style={styles.content}>
        <Text style={styles.stepBadge}>Step {step} of 3</Text>

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.emoji}>🧍</Text>
            <Text style={styles.title}>Stand in Front of Camera</Text>
            <Text style={styles.subtitle}>
              Make sure your upper body and arms are clearly visible in the preview.
            </Text>
          </View>
        ) : step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.emoji}>🙌</Text>
            <Text style={styles.title}>Raise Both Arms High</Text>
            <Text style={styles.subtitle}>
              Stretch your arms up high so PetalPath can measure your movement range.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.title}>Calibration Ready!</Text>
            <Text style={styles.subtitle}>
              Baseline shoulder width: {Math.round((profile.shoulderWidth || 0.2) * 100)}% ratio. You are all set!
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>
              {step === 3 ? 'Save & Finish' : 'Next Step'}
            </Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleSkip}>
            <Text style={styles.secondaryButtonText}>Skip Setup</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadge: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    color: colors.purple,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xl,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.purple,
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: colors.card,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});

export default CalibrationScreen;
