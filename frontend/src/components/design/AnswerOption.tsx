import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadows, spacing, typography, answerSizes } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * AnswerOption + AnswerGrid (spec §28).
 *
 * Listen, Speak and the quiz-style activities all present the same thing: a
 * short row of big tappable choices that turn green or red once answered. Each
 * screen used to hand-roll that with its own four colour variants and its own
 * 90px tile, which is exactly the per-page drift §35 rules out. One component
 * now owns it.
 *
 * Answered state never rests on colour alone (§30): a correct tile gains a
 * check, a wrong one gains a cross, and both carry an accessibility label
 * saying which they are.
 */

export type AnswerOptionState =
  | 'idle'
  /** Chosen, but not submitted yet. */
  | 'selected'
  | 'correct'
  | 'incorrect'
  /** Answered, and this wasn't the interesting tile — recede. */
  | 'muted';

/**
 * Rotating tile palette so a row of choices is colourful without any of them
 * looking like the screen's primary action. Pink is left out on purpose — it
 * belongs to buttons (§3) — and purple is reserved for the selected state, so
 * "selected" always reads as a deliberate change rather than another hue.
 */
const PALETTE = [
  { main: colors.blue, soft: colors.blueSoft, ink: colors.blueDark },
  { main: colors.green, soft: colors.greenSoft, ink: '#4F7F3D' },
  { main: colors.yellow, soft: colors.yellowSoft, ink: '#8A6A0C' },
  { main: colors.orange, soft: colors.warningLight, ink: colors.warningDark },
] as const;

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface Skin {
  bg: string;
  border: string;
  ink: string;
  /** Trailing status icon, when the tile has one to show. */
  mark?: PetalIconName;
  markColor?: string;
  opacity: number;
  borderWidth: number;
}

const skinFor = (state: AnswerOptionState, paletteIndex: number): Skin => {
  const p = PALETTE[paletteIndex % PALETTE.length];

  switch (state) {
    case 'correct':
      return {
        bg: colors.greenSoft,
        border: colors.green,
        ink: colors.successDark,
        mark: 'check',
        markColor: colors.successDark,
        opacity: 1,
        borderWidth: 3,
      };
    case 'incorrect':
      return {
        bg: colors.errorLight,
        border: colors.error,
        ink: '#A83B34',
        mark: 'close',
        markColor: '#A83B34',
        opacity: 1,
        borderWidth: 3,
      };
    case 'selected':
      return {
        bg: colors.secondaryLight,
        border: colors.purple,
        ink: colors.purpleDark,
        mark: 'check',
        markColor: colors.purple,
        opacity: 1,
        borderWidth: 3,
      };
    case 'muted':
      return {
        bg: colors.surfaceSecondary,
        border: colors.border,
        ink: colors.textSecondary,
        opacity: 0.6,
        borderWidth: 2,
      };
    default:
      return {
        bg: p.soft,
        border: p.main,
        ink: colors.text,
        opacity: 1,
        borderWidth: 2,
      };
  }
};

/** Spoken description of the tile's state, appended to its accessible label. */
const STATE_HINT: Partial<Record<AnswerOptionState, string>> = {
  selected: 'selected',
  correct: 'correct answer',
  incorrect: 'wrong answer',
};

export interface AnswerOptionProps {
  /** The choice itself — a word, a letter, a short phrase. */
  label: string;
  onPress?: () => void;
  state?: AnswerOptionState;
  /**
   * Which tile colour to use. Pass the option's position in the list; the
   * palette wraps, so any length works.
   */
  paletteIndex?: number;
  /** Show the circled A / B / C marker. Default true. */
  showOrdinal?: boolean;
  /** Leading icon, for options that are a concept rather than a word. */
  icon?: PetalIconName;
  /** Taller tile, for options that carry a picture. */
  media?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  label,
  onPress,
  state = 'idle',
  paletteIndex = 0,
  showOrdinal = true,
  icon,
  media = false,
  disabled = false,
  style,
  testID,
}) => {
  const inert = disabled || !onPress;
  const skin = skinFor(state, paletteIndex);
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) => {
    if (inert) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  };

  const hint = STATE_HINT[state];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={inert ? undefined : onPress}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        disabled={inert}
        accessibilityRole="button"
        accessibilityLabel={hint ? `${label}, ${hint}` : label}
        accessibilityState={{
          disabled: inert,
          selected: state === 'selected' || state === 'correct',
        }}
        testID={testID}
        style={({ pressed }) => [
          styles.tile,
          state === 'idle' || state === 'selected' ? shadows.sm : null,
          {
            minHeight: media ? answerSizes.minHeightMedia : answerSizes.minHeight,
            backgroundColor: skin.bg,
            borderColor: skin.border,
            borderWidth: skin.borderWidth,
            opacity: skin.opacity * (pressed && !inert ? 0.9 : 1),
          },
        ]}
      >
        {showOrdinal ? (
          <View
            style={[
              styles.ordinal,
              { backgroundColor: colors.surface, borderColor: skin.border },
            ]}
          >
            <Text style={[typography.presets.caption, styles.ordinalText, { color: skin.ink }]}>
              {LETTERS[paletteIndex % LETTERS.length]}
            </Text>
          </View>
        ) : null}

        {icon ? <PetalIcon name={icon} size={26} color={skin.ink} /> : null}

        <Text
          style={[typography.presets.cardTitle, styles.label, { color: skin.ink }]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {skin.mark ? (
          <View style={styles.mark}>
            <PetalIcon name={skin.mark} size={20} color={skin.markColor ?? skin.ink} filled />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// AnswerGrid
// ---------------------------------------------------------------------------

export interface AnswerGridProps {
  children: React.ReactNode;
  /**
   * 2 gives the two-up grid the activity screens use; 1 stacks full-width
   * options, which suits long phrases. Percentage widths rather than fixed
   * ones, so nothing overflows at 360px and nothing looks stranded at 430px
   * (§27).
   */
  columns?: 1 | 2;
  style?: StyleProp<ViewStyle>;
}

export const AnswerGrid: React.FC<AnswerGridProps> = ({ children, columns = 2, style }) => (
  <View style={[styles.grid, style]}>
    {React.Children.map(children, (child, i) =>
      child == null ? null : (
        <View key={i} style={columns === 1 ? styles.cellFull : styles.cellHalf}>
          {child}
        </View>
      ),
    )}
  </View>
);

const styles = StyleSheet.create({
  tile: {
    // flexGrow (rather than `flex: 1`) so the tile measures from its content
    // first and only then stretches to match the tallest tile in its row —
    // `flex: 1` inside an auto-height cell collapses to the minimum instead.
    flexGrow: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ordinal: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: answerSizes.ordinal,
    height: answerSizes.ordinal,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordinalText: {
    lineHeight: 14,
  },
  label: {
    textAlign: 'center',
  },
  mark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cellHalf: {
    // 48% + 48% leaves a 4% gutter that scales with the screen instead of
    // being a fixed gap that overflows on the narrowest phones.
    width: '48%',
    marginBottom: answerSizes.gap,
  },
  cellFull: {
    width: '100%',
    marginBottom: answerSizes.gap,
  },
});

export default AnswerOption;
