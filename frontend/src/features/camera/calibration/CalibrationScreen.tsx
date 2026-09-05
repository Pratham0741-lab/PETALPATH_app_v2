/**
 * Quick Camera Calibration — the three-step setup (spec §34 phase 7).
 *
 * Behaviour is untouched (§1): the same `useCalibration` hook, the same
 * step-then-save `handleNext`, the same `handleSkip` that saves and leaves, and
 * the same shoulder-width readout with its `|| 0.2` fallback.
 *
 * The surface is rebuilt. The three steps were carried entirely by a 56px emoji
 * each — 🧍, 🙌, ✨ — which is exactly what §7 rules out, and the card had its own
 * hand-mixed shadow rather than the shared one (§5). Steps now use `IconWell`
 * with glyphs that say the same thing honestly: a camera for "stand in front of
 * it", an up arrow for "raise your arms high", a tick for "ready". Each step also
 * has its own colour, so the three feel like progress rather than one screen
 * redrawn.
 *
 * "Step 2 of 3" was a pink caption; it is now a real `ProgressIndicator`, which
 * means a screen reader announces the position instead of a child having to read
 * it, and the two buttons are the shared pair rather than two `Pressable`s.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AppShell,
  Card,
  IconWell,
  PageHeader,
  PrimaryButton,
  ProgressIndicator,
  SecondaryButton,
} from '../../../components/design';
import type { PetalIconName } from '../../../components/icons';
import { useCalibration } from './useCalibration';
import { cardSizes, colors, spacing, typography, layoutSizes } from '../../../theme';
import { SCREEN_BACKGROUNDS } from '../../../assets/backgrounds';

const TOTAL_STEPS = 3;

/**
 * One entry per step. The glyphs are literal rather than decorative: `camera`
 * for standing in front of it, `arrowUp` for raising your arms, `check` for
 * done — none of them pretends to depict a body, which the icon set has no
 * honest glyph for (§7).
 */
const STEPS: Array<{
  icon: PetalIconName;
  color: string;
  soft: string;
  title: string;
}> = [
  {
    icon: 'camera',
    color: colors.blue,
    soft: colors.blueSoft,
    title: 'Stand in Front of Camera',
  },
  {
    icon: 'arrowUp',
    color: colors.purple,
    soft: colors.secondaryLight,
    title: 'Raise Both Arms High',
  },
  {
    icon: 'check',
    color: colors.green,
    soft: colors.greenSoft,
    title: 'Calibration Ready!',
  },
];

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

  const current = STEPS[step - 1] ?? STEPS[0];
  const isLast = step === TOTAL_STEPS;

  /* Copy per step, kept word for word from the original. */
  const message =
    step === 1
      ? 'Make sure your upper body and arms are clearly visible in the preview.'
      : step === 2
      ? 'Stretch your arms up high so PetalPath can measure your movement range.'
      : `Baseline shoulder width: ${Math.round(
          (profile.shoulderWidth || 0.2) * 100,
        )}% ratio. You are all set!`;

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.camera} scroll={false} header={<PageHeader title="Quick Camera Calibration" />}>
      <View style={styles.column}>
        <ProgressIndicator
          value={(step / TOTAL_STEPS) * 100}
          label={`Step ${step} of ${TOTAL_STEPS}`}
          color={current.color}
          countOf={{ current: step, total: TOTAL_STEPS }}
          accessibilityLabel={`Calibration step ${step} of ${TOTAL_STEPS}`}
          style={styles.progress}
        />

        <Card variant="raised" padding="roomy" accent={current.color} contentStyle={styles.card}>
          <IconWell
            icon={current.icon}
            color={current.color}
            soft={current.soft}
            size={cardSizes.iconWellLarge}
            filled
          />
          <Text style={[typography.presets.section, styles.title]} accessibilityRole="header">
            {current.title}
          </Text>
          <Text style={[typography.presets.body, styles.message]}>{message}</Text>
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            label={isLast ? 'Save & Finish' : 'Next Step'}
            icon={isLast ? 'check' : undefined}
            iconRight={isLast ? undefined : 'forward'}
            size="lg"
            onPress={handleNext}
          />
          <SecondaryButton
            label="Skip Setup"
            onPress={handleSkip}
            accessibilityHint="Saves what we have and returns to the activities"
          />
        </View>
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  column: {
    /* Centres the card vertically without `flex: 1` — this sits in AppShell's
       non-scrolling body, but `flexGrow` is safe either way. */
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: layoutSizes.dialog,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  progress: {
    alignSelf: 'stretch',
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});

export default CalibrationScreen;
