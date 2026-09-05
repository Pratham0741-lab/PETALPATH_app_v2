import React, { useMemo, useRef, useState } from 'react';
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
}

function makeChallenge(): { a: number; b: number } {
  // Two single-digit factors, both >= 2 so the answer isn't trivially the other.
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  return { a, b };
}

export const GrownUpGate: React.FC<GrownUpGateProps> = ({ visible, onUnlock, onCancel }) => {
  const [challenge, setChallenge] = useState(makeChallenge);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const answer = useMemo(() => challenge.a * challenge.b, [challenge]);

  const reset = () => {
    setChallenge(makeChallenge());
    setEntry('');
    setError(false);
  };

  const handleSubmit = () => {
    if (parseInt(entry, 10) === answer) {
      reset();
      onUnlock();
      return;
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

            <View style={styles.actions}>
              <SecondaryButton label="Cancel" onPress={handleCancel} />
              <PrimaryButton label="Unlock" onPress={handleSubmit} disabled={entry.length === 0} />
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
