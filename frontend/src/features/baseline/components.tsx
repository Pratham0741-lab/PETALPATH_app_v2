/**
 * Building blocks for the baseline questionnaire screens: the mascot guide,
 * big picture answer tiles (including "I don't know"), and the progress path.
 * Nothing here asks a child to read: tiles are pictures, progress is stars.
 */
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MENTOR_IMAGES } from '../../assets/characters';
import { PetalIcon, resolveSpecies } from '../../components/design';
import { colors, radius, spacing, typography } from '../../theme';
import { mediaUrl } from './audio';
import type { BaselineDomain } from './types';

/** Plain-language domain names for the parent-facing screens. */
export const DOMAIN_LABELS: Record<BaselineDomain, string> = {
  english: 'English',
  maths: 'Numbers and counting',
  hindi: 'Hindi',
  fine_motor: 'Hand and finger control',
  cognitive: 'Thinking and puzzles',
  sel: 'Feelings and getting along',
  life_skills: 'Everyday self-care',
  evs: 'The world around us',
};

/** The child's own mascot (their chosen mentor), with an optional speech bubble. */
export const MascotGuide: React.FC<{ characterType?: string | null; line?: string | null; size?: number }> = ({
  characterType,
  line,
  size = 96,
}) => {
  const source = MENTOR_IMAGES[resolveSpecies(characterType)] ?? MENTOR_IMAGES.panda;
  return (
    <View style={styles.mascotRow}>
      {source ? <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      {line ? (
        <View style={styles.bubble} accessibilityLiveRegion="polite">
          <Text style={[typography.presets.body, styles.bubbleText]}>{line}</Text>
        </View>
      ) : null}
    </View>
  );
};

/**
 * A picture from the item bank. Until the real artwork exists the paths are
 * placeholders that will not load; the tile then shows the option's label so
 * the flow can still be tested.
 */
export const BankImage: React.FC<{ path?: string | null; label?: string; size: number }> = ({ path, label, size }) => {
  const [failed, setFailed] = useState(false);
  const uri = mediaUrl(path);
  if (!uri || failed) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Text style={[typography.presets.title, styles.fallbackText]} numberOfLines={2} adjustsFontSizeToFit>
          {label ?? '?'}
        </Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" onError={() => setFailed(true)} />;
};

export const OptionTile: React.FC<{
  image?: string | null;
  label: string;
  size: number;
  chosen: boolean;
  disabled: boolean;
  onPress: () => void;
  /** Spoken label for screen readers (the child does not read it). */
  accessibilityLabel: string;
  idk?: boolean;
}> = ({ image, label, size, chosen, disabled, onPress, accessibilityLabel, idk }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      styles.tile,
      idk && styles.tileIdk,
      // The same soft highlight for every answer: there is no "wrong" colour.
      chosen && styles.tileChosen,
      pressed && !disabled && styles.tilePressed,
    ]}
  >
    {idk && !image ? (
      <View style={[styles.idkGlyph, { width: size, height: size }]}>
        <Text style={styles.idkMark}>?</Text>
      </View>
    ) : (
      <BankImage path={image} label={label} size={size} />
    )}
  </Pressable>
);

/** One star per stop on the path; filled once passed, glowing when current. */
export const ProgressPath: React.FC<{ stops: number; current: number }> = ({ stops, current }) => (
  <View style={styles.path} accessibilityRole="progressbar" accessibilityLabel="Progress">
    {Array.from({ length: stops }, (_, i) => (
      <React.Fragment key={i}>
        {i > 0 ? <View style={[styles.pathLine, i <= current && styles.pathLineDone]} /> : null}
        <View style={[styles.pathStop, i === current && styles.pathStopCurrent]}>
          <PetalIcon name={i < current ? 'star' : i === current ? 'sparkle' : 'star'} size={22} color={i <= current ? colors.yellow : colors.border} />
        </View>
      </React.Fragment>
    ))}
  </View>
);

const styles = StyleSheet.create({
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bubble: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bubbleText: { color: colors.text },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  fallbackText: { color: colors.purple, textAlign: 'center' },
  tile: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIdk: { backgroundColor: colors.yellowSoft },
  tileChosen: { borderColor: colors.purple, backgroundColor: colors.secondaryLight },
  tilePressed: { transform: [{ scale: 0.96 }] },
  idkGlyph: { alignItems: 'center', justifyContent: 'center' },
  idkMark: { fontSize: 72, lineHeight: 84, color: colors.textSecondary },
  path: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pathLine: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.border },
  pathLineDone: { backgroundColor: colors.yellow },
  pathStop: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pathStopCurrent: { backgroundColor: colors.yellowSoft, transform: [{ scale: 1.15 }] },
});
