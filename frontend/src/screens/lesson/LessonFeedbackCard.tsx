/**
 * LessonFeedbackCard — "Grown-ups: how was this lesson?" on Lesson Completed.
 *
 * A grown-up's 1–5 rating of the lesson the child just finished, with optional
 * quick reasons and a comment. Deliberately low-friction and never in the way:
 *
 *  - Inline, not a modal, and not behind the parent gate. It sits above the
 *    sticky footer, so Continue / View Rewards stay reachable and are never
 *    delayed by anything here.
 *  - Tapping a star submits at once. Reasons and comment are extras that update
 *    the same record; Skip keeps the rating.
 *  - Taps within the first second after the card appears are ignored. A child
 *    still tapping away at the celebration should not leave a rating by accident.
 *  - Outline stars in purple, never the filled gold of the reward stars above,
 *    so nobody mistakes this for the child's score.
 *
 * Offline submissions are queued by `useLessonFeedback` and sent on reconnect.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../../theme';
import { Card, PrimaryButton, SecondaryButton } from '../../components/design';
import { PetalIcon } from '../../components/icons';
import {
  FEEDBACK_COMMENT_MAX,
  useLessonFeedback,
  type FeedbackReason,
  type LessonFeedbackOutcome,
} from '../../hooks/useLessonFeedback';

/** Taps sooner than this after the card appears are treated as accidental. */
const ACCIDENTAL_TAP_MS = 1000;
/** How long "Thanks!" shows before the optional extras slide in. */
const CONFIRM_MS = 900;
const STAR_SIZE = 34;

const REASONS: { code: FeedbackReason; label: string }[] = [
  { code: 'TOO_EASY', label: 'Too easy' },
  { code: 'TOO_HARD', label: 'Too hard' },
  { code: 'TOO_LONG', label: 'Too long' },
  { code: 'LOST_INTEREST', label: 'Lost interest' },
  { code: 'LOVED_IT', label: 'Loved it' },
];

type Phase = 'rate' | 'confirm' | 'details' | 'done';

const confirmText = (outcome: LessonFeedbackOutcome) =>
  outcome === 'queued' ? "Thanks! We'll send it when you're back online." : 'Thanks! Rating saved.';

export interface LessonFeedbackCardProps {
  lessonId: string;
  childId: string;
}

export const LessonFeedbackCard: React.FC<LessonFeedbackCardProps> = ({ lessonId, childId }) => {
  const feedback = useLessonFeedback(lessonId, childId);

  const appearedAt = useRef(Date.now());
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const [phase, setPhase] = useState<Phase>('rate');
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const [comment, setComment] = useState('');

  const onStar = useCallback(
    async (value: number) => {
      if (Date.now() - appearedAt.current < ACCIDENTAL_TAP_MS) return;
      if (phase === 'done') return;

      const first = rating === 0;
      setRating(value);
      setError(null);
      try {
        const outcome = await feedback.mutateAsync({ rating: value });
        if (!mounted.current) return;
        setStatus(confirmText(outcome));
        if (first) {
          setPhase('confirm');
          timer.current = setTimeout(() => mounted.current && setPhase('details'), CONFIRM_MS);
        }
      } catch {
        if (!mounted.current) return;
        if (first) setRating(0);
        setStatus(null);
        setError("Couldn't save that. Tap a star to try again.");
      }
    },
    [feedback, phase, rating],
  );

  const toggleReason = (code: FeedbackReason) =>
    setReasons((r) => (r.includes(code) ? r.filter((c) => c !== code) : [...r, code]));

  const onSend = async () => {
    setError(null);
    try {
      const outcome = await feedback.mutateAsync({
        rating,
        reasons,
        comment: comment.trim() || null,
      });
      if (!mounted.current) return;
      setStatus(outcome === 'queued' ? "Thanks! We'll send it when you're back online." : 'Thanks for telling us!');
      setPhase('done');
    } catch {
      if (mounted.current) setError("Couldn't send that. Please try again.");
    }
  };

  // The rating is already saved; Skip only closes the extras.
  const onSkip = () => {
    setStatus('Thanks! Rating saved.');
    setPhase('done');
  };

  const sending = feedback.isPending && phase === 'details';

  return (
    <Animated.View entering={FadeInDown.duration(320)} layout={LinearTransition}>
      <Card variant="flat" padding="normal" style={styles.card} testID="lesson-feedback-card">
        <Text style={[typography.presets.section, styles.heading]} accessibilityRole="header">
          Grown-ups: how was this lesson?
        </Text>

        <View
          style={styles.stars}
          accessibilityRole="radiogroup"
          accessibilityLabel="Rate this lesson from 1 to 5 stars"
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const selected = star <= rating;
            return (
              <Pressable
                key={star}
                onPress={() => void onStar(star)}
                disabled={phase === 'done'}
                hitSlop={Math.max(0, (MIN_TOUCH_TARGET - STAR_SIZE) / 2)}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: phase === 'done' }}
                accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                style={({ pressed }) => [styles.star, pressed && styles.pressed]}
                testID={`lesson-feedback-star-${star}`}
              >
                <PetalIcon
                  name="star"
                  size={STAR_SIZE}
                  filled={false}
                  color={selected ? colors.secondaryDark : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>

        {status && phase !== 'details' ? (
          <Animated.Text
            entering={FadeIn}
            exiting={FadeOut}
            style={[typography.presets.caption, styles.status]}
            accessibilityLiveRegion="polite"
          >
            {status}
          </Animated.Text>
        ) : null}

        {error ? (
          <Text style={[typography.presets.caption, styles.error]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        {phase === 'details' ? (
          <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOut} style={styles.details}>
            <Text style={[typography.presets.caption, styles.label]}>Anything stand out? (optional)</Text>
            <View style={styles.chips}>
              {REASONS.map(({ code, label }) => {
                const on = reasons.includes(code);
                return (
                  <Pressable
                    key={code}
                    onPress={() => toggleReason(code)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
                  >
                    <Text style={[typography.presets.caption, styles.chipText, on && styles.chipTextOn]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Anything else? (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={FEEDBACK_COMMENT_MAX}
              textAlignVertical="top"
              style={styles.input}
              accessibilityLabel="Optional comment about this lesson"
              accessibilityHint="Please don't include your child's name or personal details"
            />
            <View style={styles.noteRow}>
              <Text style={[typography.presets.caption, styles.note]}>
                Please don't include your child's name or personal details
              </Text>
              <Text style={[typography.presets.caption, styles.counter]}>
                {comment.length}/{FEEDBACK_COMMENT_MAX}
              </Text>
            </View>

            <View style={styles.actions}>
              <SecondaryButton label="Skip" size="sm" fullWidth={false} onPress={onSkip} disabled={sending} />
              <PrimaryButton
                label="Send"
                size="sm"
                fullWidth={false}
                tone="purple"
                onPress={() => void onSend()}
                loading={sending}
              />
            </View>
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  star: {
    padding: 2,
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
  status: {
    color: colors.successDark,
    textAlign: 'center',
  },
  error: {
    color: colors.errorDark,
    textAlign: 'center',
  },
  details: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryLight,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextOn: {
    color: colors.secondaryDark,
  },
  input: {
    minHeight: 88,
    maxHeight: 160,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.families.body.regular,
    fontSize: 15,
    color: colors.text,
  },
  noteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  note: {
    flex: 1,
    color: colors.textMuted,
  },
  counter: {
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

export default LessonFeedbackCard;
