/**
 * The child's part: one picture question at a time, spoken aloud, answered by
 * tapping a big picture or the "I don't know" tile.
 *
 * Every answer gets the same gentle sound and the same encouraging line —
 * right, wrong and "I don't know" are indistinguishable to the child.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, IconButton, PetalIcon } from '../../components/design';
import { MascotGuide, OptionTile, ProgressPath, BankImage } from '../../features/baseline/components';
import { ITEM_BANK, useBaselineStore, type ChildBaselineState } from '../../features/baseline/baselineStore';
import { childDomains, makeAnswer } from '../../features/baseline/engine';
import { playSequence, stopBaselineAudio } from '../../features/baseline/audio';
import { IDK, type AssessmentItem } from '../../features/baseline/types';
import type { Child } from '../../types/child';
import { colors, spacing, typography } from '../../theme';

/** How long the encouragement shows before the next question. */
const PAUSE_MS = 1800;

export const BaselineChildPart: React.FC<{
  child: Child;
  state: ChildBaselineState;
  item: AssessmentItem;
  onGrownUp: () => void;
}> = ({ child, state, item, onGrownUp }) => {
  const { width } = useWindowDimensions();
  const [chosen, setChosen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstItem = state.answers.length === 0;

  const domains = childDomains(ITEM_BANK, state.grade);
  const current = Math.max(0, domains.indexOf(item.domain));

  const speak = () => playSequence(firstItem ? [ITEM_BANK.common.intro_audio, item.prompt_audio] : [item.prompt_audio]);

  // Each new question is read aloud automatically.
  useEffect(() => {
    setChosen(null);
    speak();
    return () => stopBaselineAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onAnswer = (response: string) => {
    if (chosen) return;
    setChosen(response);
    playSequence([ITEM_BANK.common.answer_sound, ITEM_BANK.common.encouragement_audio]);
    timer.current = setTimeout(() => {
      void useBaselineStore.getState().answer(child.id, makeAnswer(ITEM_BANK, item, response));
    }, PAUSE_MS);
  };

  // Big tiles: up to 3 per row on a phone, sized from the screen.
  const perRow = item.options.length + 1 <= 3 ? item.options.length + 1 : 2;
  const tile = Math.min(200, Math.floor((Math.min(width, 720) - spacing.xl * 2 - spacing.md * (perRow - 1)) / perRow) - spacing.md * 2);

  return (
    <AppShell petals="none" scroll>
      <View style={styles.body}>
        <View style={styles.top}>
          <MascotGuide characterType={child.mentor?.characterType} size={84} line={chosen ? ITEM_BANK.common.encouragement_text : null} />
          <View style={styles.topActions}>
            <IconButton icon="sound" size="lg" tone="purple" variant="solid" onPress={speak} accessibilityLabel="Hear the question again" />
            <Pressable onPress={onGrownUp} accessibilityRole="button" accessibilityLabel="Grown-ups: pause or skip the check" hitSlop={12} style={styles.grownUp}>
              <PetalIcon name="parent" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <ProgressPath stops={domains.length} current={current} />

        {/* For a grown-up reading along; the child hears it. Large so a parent
            holding the phone at arm's length can read it. */}
        <Text style={[typography.presets.section, styles.question]} accessibilityRole="header">
          {item.prompt_text}
        </Text>

        {item.images.length > 0 ? (
          <View style={styles.prompt} accessible accessibilityLabel={item.prompt_text}>
            {item.images.map((img, i) => (
              <BankImage key={`${img}-${i}`} path={img} size={item.images.length > 3 ? 56 : 88} label="•" />
            ))}
          </View>
        ) : null}

        <View style={styles.grid}>
          {item.options.map((o) => (
            <OptionTile
              key={o.id}
              image={o.image}
              label={o.label}
              size={tile}
              chosen={chosen === o.id}
              disabled={!!chosen}
              onPress={() => onAnswer(o.id)}
              accessibilityLabel={o.label}
            />
          ))}
          <OptionTile
            idk
            image={ITEM_BANK.common.idk_image}
            label="?"
            size={tile}
            chosen={chosen === IDK}
            disabled={!!chosen}
            onPress={() => onAnswer(IDK)}
            accessibilityLabel="I don't know"
          />
        </View>

      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.lg, paddingVertical: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  topActions: { alignItems: 'center', gap: spacing.md },
  grownUp: { padding: spacing.xs, opacity: 0.7 },
  prompt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 24,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  question: { fontSize: 22, lineHeight: 29, textAlign: 'center', color: colors.text },
});
