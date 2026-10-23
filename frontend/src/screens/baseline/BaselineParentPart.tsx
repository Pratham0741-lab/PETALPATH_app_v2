/** The parent's part: a few observation questions, Yes / Sometimes / Not yet. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppShell, Card, PrimaryButton, SecondaryButton } from '../../components/design';
import { ITEM_BANK, useBaselineStore, type ChildBaselineState } from '../../features/baseline/baselineStore';
import { makeAnswer, nextParentItem, optionsFor, parentItems } from '../../features/baseline/engine';
import { DOMAIN_LABELS } from '../../features/baseline/components';
import type { Child } from '../../types/child';
import { colors, spacing, typography } from '../../theme';

export const BaselineParentPart: React.FC<{ child: Child; state: ChildBaselineState; onSkip: () => void }> = ({
  child,
  state,
  onSkip,
}) => {
  const item = nextParentItem(ITEM_BANK, state.grade, state.answers);
  const total = parentItems(ITEM_BANK, state.grade).length;
  const asked = state.answers.filter((a) => a.parent).length;

  // No parent questions left (or none for this grade): finish.
  if (!item) {
    return (
      <AppShell petals="none" scroll={false}>
        <View style={styles.body}>
          <Text style={[typography.presets.title, styles.title]}>All done — thank you!</Text>
          <PrimaryButton label="See the results" iconRight="forward" size="lg" fullWidth onPress={() => useBaselineStore.getState().complete(child.id)} />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell petals="none" scroll>
      <View style={styles.body}>
        <Text style={[typography.presets.eyebrow, styles.eyebrow]}>
          For you · question {asked + 1} of {total}
        </Text>
        <Text style={[typography.presets.title, styles.title]} accessibilityRole="header">
          A few quick questions about {child.name}
        </Text>
        <Card variant="raised" padding="roomy">
          <Text style={[typography.presets.caption, styles.domain]}>{DOMAIN_LABELS[item.domain]}</Text>
          <Text style={[typography.presets.cardTitle, styles.question]}>{item.prompt_text}</Text>
          <View style={styles.answers}>
            {optionsFor(ITEM_BANK, item).map((o) => (
              <PrimaryButton
                key={o.id}
                label={o.label}
                size="lg"
                fullWidth
                tone={o.id === 'yes' ? 'green' : o.id === 'sometimes' ? 'yellow' : 'neutral'}
                onPress={() => useBaselineStore.getState().answer(child.id, makeAnswer(ITEM_BANK, item, o.id))}
              />
            ))}
          </View>
        </Card>
        <SecondaryButton label="Skip the rest" onPress={onSkip} accessibilityHint="Starts at the usual place for this age instead" />
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingVertical: spacing.xl },
  eyebrow: { color: colors.purple },
  title: { color: colors.text },
  domain: { color: colors.textSecondary, marginBottom: spacing.xs },
  question: { color: colors.text },
  answers: { gap: spacing.md, marginTop: spacing.lg },
});
