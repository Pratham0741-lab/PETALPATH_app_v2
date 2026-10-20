/**
 * LessonFeedbackSheet — "Grown-ups: how was this lesson?" on Lesson Completed.
 *
 * A grown-up's 1–5 rating of the lesson the child just finished, with optional
 * quick reasons and a comment. It slides up as a bottom sheet once the
 * celebration has played: as an inline card it sat below the fold and went
 * unseen. Kept quick to get rid of:
 *
 *  - Closes from the ✕, a tap on the dimmed backdrop, or Android back. Nothing
 *    here gates the completion — Continue is right there once it closes.
 *  - Not behind the parent gate.
 *  - Tapping a star submits at once. Reasons and comment are extras that update
 *    the same record; Skip, ✕ and the backdrop all keep the rating.
 *  - Taps within the first second after it appears are ignored. A child still
 *    tapping away at the celebration should not leave a rating by accident.
 *  - Outline stars in purple, never the filled gold of the reward stars, so
 *    nobody mistakes this for the child's score.
 *
 * Offline submissions are queued by `useLessonFeedback` and sent on reconnect.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../../theme';
import { IconButton, PrimaryButton, SecondaryButton } from '../../components/design';
import { PetalIcon } from '../../components/icons';
import {
  FEEDBACK_COMMENT_MAX,
  useLessonFeedback,
  type FeedbackReason,
  type LessonFeedbackOutcome,
} from '../../hooks/useLessonFeedback';

/** Taps sooner than this after the sheet appears are treated as accidental. */
const ACCIDENTAL_TAP_MS = 1000;
/** How long "Thanks!" shows before the optional extras slide in. */
const CONFIRM_MS = 900;
/** How long the final thank-you stays before the sheet closes itself. */
const CLOSE_AFTER_DONE_MS = 1400;
const STAR_SIZE = 38;

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

export interface LessonFeedbackSheetProps {
  visible: boolean;
  lessonId: string;
  childId: string;
  onClose: () => void;
}

export const LessonFeedbackSheet: React.FC<LessonFeedbackSheetProps> = ({
  visible,
  lessonId,
  childId,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const feedback = useLessonFeedback(lessonId, childId);

  const appearedAt = useRef(0);
  const mounted = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(() => mounted.current && fn(), ms));
  };
  useEffect(
    () => () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  useEffect(() => {
    if (!visible) return;
    appearedAt.current = Date.now();
    // Android back closes the sheet rather than leaving the screen.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

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
          later(() => setPhase('details'), CONFIRM_MS);
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

  const finish = (message: string) => {
    setStatus(message);
    setPhase('done');
    later(onClose, CLOSE_AFTER_DONE_MS);
  };

  const onSend = async () => {
    setError(null);
    try {
      const outcome = await feedback.mutateAsync({
        rating,
        reasons,
        comment: comment.trim() || null,
      });
      if (!mounted.current) return;
      finish(outcome === 'queued' ? "Thanks! We'll send it when you're back online." : 'Thanks for telling us!');
    } catch {
      if (mounted.current) setError("Couldn't send that. Please try again.");
    }
  };

  // The rating is already saved; Skip only closes the extras.
  const onSkip = () => finish('Thanks! Rating saved.');

  const sending = feedback.isPending && phase === 'details';

  /*
   * Drawn as an overlay on the screen, not inside a React Native `Modal`:
   * Reanimated's entering animations do not reliably run inside a Modal on
   * Android, and this sheet starts off-screen until its slide-in plays — so in
   * a Modal it could open invisibly. Callers render it as a full-screen sibling
   * of the content (`CelebrationScaffold`'s `overlay`).
   */
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
          <Pressable
            style={styles.fill}
          onPress={onClose}
          accessibilityRole="button"
            accessibilityLabel="Close feedback"
          />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(320)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          testID="lesson-feedback-sheet"
          accessibilityViewIsModal
        >
          <View style={styles.grabber} />

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            <View style={styles.headRow}>
              <Text style={[typography.presets.section, styles.heading]} accessibilityRole="header">
                Grown-ups: how was this lesson?
              </Text>
              <IconButton
                icon="close"
                size="sm"
                variant="plain"
                tone="neutral"
                onPress={onClose}
                accessibilityLabel="Close"
              />
            </View>

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
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
  },
  fill: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heading: {
    flex: 1,
    color: colors.text,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
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
    backgroundColor: colors.surfaceSecondary,
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
    paddingBottom: spacing.xs,
  },
});

export default LessonFeedbackSheet;
