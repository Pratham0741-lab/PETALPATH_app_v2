import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { PetalIcon } from '../icons';

/**
 * GrownUpGate — a lightweight parental gate for anything meant for a grown-up.
 *
 * The progress *analysis* (accuracy, mastery-over-time, before/after) is locked
 * away from the child behind this: a simple two-number multiplication a reader
 * can do and a pre-reader cannot. It is deliberately not a stored PIN — the app
 * has no PIN infrastructure yet — but it is structured so a real PIN screen can
 * drop in later without the callers changing: they only care about `onUnlock`.
 *
 * COPPA-style "ask a grown-up" gate, the same pattern kids' apps use to guard
 * settings and purchases. It keeps the numbers out of the child's reach, not a
 * determined adult's, which is exactly the intent here.
 */
export interface GrownUpGateProps {
  visible: boolean;
  onUnlock: () => void;
  onCancel: () => void;
  /**
   * `multiply` (default): a single-digit times table, typed in.
   * `add`: a two-digit addition ("17 + 26") on an on-screen number pad, with a
   * 60-second lockout after 3 wrong answers. Used where a child is most
   * motivated to get through (the daily-limit lock screen).
   */
  challenge?: 'multiply' | 'add';
}

type Challenge = { a: number; b: number };

function makeChallenge(kind: 'multiply' | 'add' = 'multiply'): Challenge {
  if (kind === 'add') {
    // Two two-digit numbers; new ones every time.
    return { a: 11 + Math.floor(Math.random() * 79), b: 11 + Math.floor(Math.random() * 79) };
  }
  // Two single-digit factors, both >= 2 so the answer isn't trivially the other.
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  return { a, b };
}

const MAX_WRONG = 3;
const LOCKOUT_MS = 60_000;
const monoNow = () =>
  typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now();
/**
 * The lockout lives outside the component, so closing and reopening the gate
 * does not clear it. Nothing is stored: no PIN, no password.
 */
const lockout = { wrong: 0, until: 0 };

export const GrownUpGate: React.FC<GrownUpGateProps> = ({
  visible,
  onUnlock,
  onCancel,
  challenge: kind = 'multiply',
}) => {
  const [challenge, setChallenge] = useState(() => makeChallenge(kind));
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);
  const [lockedFor, setLockedFor] = useState(0);
  const shake = useRef(new Animated.Value(0)).current;

  const answer = useMemo(
    () => (kind === 'add' ? challenge.a + challenge.b : challenge.a * challenge.b),
    [challenge, kind],
  );

  // Fresh numbers each time the gate opens.
  useEffect(() => {
    if (visible) {
      setChallenge(makeChallenge(kind));
      setEntry('');
      setError(false);
    }
  }, [visible, kind]);

  // Lockout countdown.
  useEffect(() => {
    if (!visible || kind !== 'add') return;
    const update = () => setLockedFor(Math.max(0, Math.ceil((lockout.until - monoNow()) / 1000)));
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [visible, kind]);

  const reset = () => {
    setChallenge(makeChallenge(kind));
    setEntry('');
    setError(false);
  };

  const handleSubmit = () => {
    if (kind === 'add' && lockout.until > monoNow()) return;
    if (parseInt(entry, 10) === answer) {
      lockout.wrong = 0;
      reset();
      onUnlock();
      return;
    }
    if (kind === 'add') {
      lockout.wrong += 1;
      if (lockout.wrong >= MAX_WRONG) {
        lockout.wrong = 0;
        lockout.until = monoNow() + LOCKOUT_MS;
        setLockedFor(Math.ceil(LOCKOUT_MS / 1000));
      }
    }
    setError(true);
    // A short shake reads as "not quite" without a word the child could act on.
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    setChallenge(makeChallenge());
    setEntry('');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        {/* Inner press is swallowed so tapping the card doesn't dismiss it. */}
        <Pressable style={styles.cardWrap} onPress={() => {}}>
          <Animated.View style={[styles.card, { transform: [{ translateX: shake }] }]}>
            <View style={styles.iconWell}>
              <PetalIcon name="parent" size={28} color={colors.primary} />
            </View>
            <Text style={[typography.presets.cardTitle, styles.title]}>Ask a grown-up</Text>
            <Text style={[typography.presets.body, styles.subtitle]}>
              This part is for parents. Solve to continue.
            </Text>

            {kind === 'add' ? (
              <AdditionPad
                challenge={challenge}
                entry={entry}
                error={error}
                lockedFor={lockedFor}
                onKey={(k) => {
                  if (k === 'OK') return handleSubmit();
                  if (error) setError(false);
                  setEntry((e) => (k === 'DEL' ? e.slice(0, -1) : e.length < 3 ? e + k : e));
                }}
              />
            ) : (
            <>
            <Text style={[typography.presets.title, styles.question]}>
              {challenge.a} × {challenge.b} = ?
            </Text>

            <TextInput
              value={entry}
              onChangeText={(t) => {
                setEntry(t.replace(/[^0-9]/g, ''));
                if (error) setError(false);
              }}
              keyboardType="number-pad"
              placeholder="Answer"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, error && styles.inputError]}
              maxLength={3}
              accessibilityLabel={`What is ${challenge.a} times ${challenge.b}?`}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {error ? (
              <Text style={[typography.presets.caption, styles.errorText]}>
                Not quite — try the new sum.
              </Text>
            ) : null}
            </>
            )}

            <View style={styles.actions}>
              <SecondaryButton label="Cancel" onPress={handleCancel} />
              {kind === 'add' ? null : (
                <PrimaryButton label="Unlock" onPress={handleSubmit} disabled={entry.length === 0} />
              )}
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'];

/** Two-digit addition with its own number pad (no system keyboard). */
const AdditionPad: React.FC<{
  challenge: Challenge;
  entry: string;
  error: boolean;
  lockedFor: number;
  onKey: (key: string) => void;
}> = ({ challenge, entry, error, lockedFor, onKey }) => {
  if (lockedFor > 0) {
    return (
      <Text style={[typography.presets.body, styles.subtitle, styles.locked]} accessibilityLiveRegion="polite">
        Too many tries. Please wait {lockedFor} seconds.
      </Text>
    );
  }
  return (
    <>
      <Text
        style={[typography.presets.title, styles.question]}
        accessibilityLabel={`What is ${challenge.a} plus ${challenge.b}?`}
      >
        {challenge.a} + {challenge.b} = ?
      </Text>
      <Text style={[typography.presets.title, styles.entry]}>{entry || ' '}</Text>
      {error ? (
        <Text style={[typography.presets.caption, styles.errorText]}>Not quite — try the new sum.</Text>
      ) : null}
      <View style={styles.pad}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => onKey(k)}
            disabled={k === 'OK' && entry.length === 0}
            accessibilityRole="button"
            accessibilityLabel={k === 'DEL' ? 'Delete' : k === 'OK' ? 'Submit answer' : k}
            style={({ pressed }) => [styles.key, k === 'OK' && styles.keyOk, pressed && styles.keyPressed]}
          >
            {k === 'DEL' ? (
              <PetalIcon name="back" size={22} color={colors.text} />
            ) : (
              <Text style={[typography.presets.cardTitle, k === 'OK' ? styles.keyOkText : styles.keyText]}>{k}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    backgroundColor: colors.surfaceTranslucent,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  question: {
    color: colors.text,
    marginTop: spacing.md,
    letterSpacing: 2,
  },
  input: {
    width: 140,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
  },
  locked: {
    marginTop: spacing.md,
  },
  entry: {
    minWidth: 120,
    textAlign: 'center',
    color: colors.text,
    borderBottomWidth: 2,
    borderColor: colors.border,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    width: 3 * 64 + 2 * spacing.sm,
    marginTop: spacing.sm,
  },
  key: {
    width: 64,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { opacity: 0.6 },
  keyOk: { backgroundColor: colors.primary },
  keyText: { color: colors.text },
  keyOkText: { color: colors.white },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
});
