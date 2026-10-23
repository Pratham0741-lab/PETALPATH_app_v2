/** Parent-facing start of the questionnaire, shown right after a profile is created. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppShell, Card, PrimaryButton, SecondaryButton } from '../../components/design';
import { MascotGuide } from '../../features/baseline/components';
import type { Child } from '../../types/child';
import { colors, spacing, typography } from '../../theme';

export const BaselineIntro: React.FC<{ child: Child; onStart: () => void; onSkip: () => void }> = ({
  child,
  onStart,
  onSkip,
}) => (
  <AppShell petals="none" scroll>
    <View style={styles.body}>
      <MascotGuide characterType={child.mentor?.characterType} size={140} />
      <Text style={[typography.presets.title, styles.title]} accessibilityRole="header">
        Let's see what {child.name} already knows
      </Text>
      <Card variant="raised" padding="roomy">
        <View style={styles.points}>
          <Text style={[typography.presets.body, styles.point]}>
            About 5 minutes of tapping pictures for {child.name}, then about 1 minute of questions for you.
          </Text>
          <Text style={[typography.presets.body, styles.point]}>
            Please sit nearby. Every question is read aloud, so no reading is needed.
          </Text>
          <Text style={[typography.presets.body, styles.point]}>
            There are no wrong answers. It only helps PetalPath choose where to start. Nothing is recorded from the
            camera or microphone.
          </Text>
        </View>
      </Card>
      <PrimaryButton label="Start" iconRight="forward" size="lg" onPress={onStart} fullWidth />
      <SecondaryButton
        label="Skip for now"
        onPress={onSkip}
        accessibilityHint="For grown-ups: starts at the usual place for this age instead"
      />
    </View>
  </AppShell>
);

const styles = StyleSheet.create({
  body: { gap: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl },
  title: { textAlign: 'center', color: colors.text },
  points: { gap: spacing.md },
  point: { color: colors.textSecondary },
});
