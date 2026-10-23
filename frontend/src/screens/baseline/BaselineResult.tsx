/**
 * Result for the parent: strengths and focus areas in plain words. No grades,
 * levels or percentages — this is a starting point, not a test.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppShell, Card, PrimaryButton } from '../../components/design';
import { DOMAIN_LABELS, MascotGuide } from '../../features/baseline/components';
import type { Baseline } from '../../features/baseline/types';
import type { Child } from '../../types/child';
import { colors, spacing, typography } from '../../theme';

const list = (domains: Baseline['strengths']) => domains.map((d) => DOMAIN_LABELS[d]);

export const BaselineResult: React.FC<{ child: Child; baseline: Baseline; onContinue: () => void }> = ({
  child,
  baseline,
  onContinue,
}) => {
  const strengths = list(baseline.strengths);
  const focus = list(baseline.focus_areas);

  return (
    <AppShell petals="none" scroll>
      <View style={styles.body}>
        <MascotGuide characterType={child.mentor?.characterType} size={120} />
        <Text style={[typography.presets.title, styles.title]} accessibilityRole="header">
          Thank you! Here's where {child.name} is starting
        </Text>

        {strengths.length > 0 ? (
          <Card variant="raised" padding="roomy" accent={colors.green}>
            <Text style={[typography.presets.cardTitle, styles.heading]}>{child.name} is already confident with</Text>
            {strengths.map((s) => (
              <Text key={s} style={[typography.presets.body, styles.item]}>• {s}</Text>
            ))}
          </Card>
        ) : null}

        {focus.length > 0 ? (
          <Card variant="raised" padding="roomy" accent={colors.purple}>
            <Text style={[typography.presets.cardTitle, styles.heading]}>Good places to grow next</Text>
            {focus.map((s) => (
              <Text key={s} style={[typography.presets.body, styles.item]}>• {s}</Text>
            ))}
          </Card>
        ) : null}

        <Text style={[typography.presets.body, styles.note]}>
          This is a starting point, not a test. Lessons begin at the right level for each area and keep adjusting as{' '}
          {child.name} learns.
        </Text>

        <PrimaryButton label="Start learning" iconRight="forward" size="lg" fullWidth onPress={onContinue} />
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.lg, alignItems: 'stretch', paddingVertical: spacing.xl },
  title: { color: colors.text, textAlign: 'center' },
  heading: { color: colors.text, marginBottom: spacing.sm },
  item: { color: colors.textSecondary },
  note: { color: colors.textSecondary, textAlign: 'center' },
});
