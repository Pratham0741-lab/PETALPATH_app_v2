import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { PetalIcon } from '../icons';
import { AlertButton, AlertRequest, registerAlertHost } from '../../utils/alert';

/**
 * AppAlertHost — the app's own dialog, replacing the operating system's.
 *
 * Mounted once, at the root. It listens for requests published by `customAlert`
 * and draws them with the design system: the translucent card the rest of the
 * app uses, the pink/ink palette, Fredoka for the title and Nunito for the
 * message, and real `PrimaryButton`/`SecondaryButton` actions instead of the
 * platform's flat text links.
 *
 * Alerts are queued rather than replaced. Two `customAlert` calls in the same
 * tick is rare but real (a failed save followed by a sync warning), and the
 * native dialog stacks them; dropping the second here would lose whatever
 * callback it carried.
 */

/** Confirmations get a warning face; everything else is a friendly one. */
const toneFor = (buttons: AlertButton[]) =>
  buttons.some((b) => b.style === 'destructive') ? 'danger' : 'brand';

export const AppAlertHost: React.FC = () => {
  const [queue, setQueue] = useState<AlertRequest[]>([]);
  const current = queue[0] ?? null;

  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => registerAlertHost((request) => setQueue((q) => [...q, request])), []);

  useEffect(() => {
    if (!current) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [current?.id, enter]);

  /**
   * The callback fires after the card is dismissed, not before. Several callers
   * navigate from `onPress` (picking a child pushes MainTabs), and running that
   * while a Modal is still mounted leaves the modal orphaned over the new screen.
   */
  const dismiss = useCallback((button?: AlertButton) => {
    setQueue((q) => q.slice(1));
    button?.onPress?.();
  }, []);

  if (!current) return null;

  const tone = toneFor(current.buttons);
  const cancel = current.buttons.find((b) => b.style === 'cancel');
  const actions = current.buttons.filter((b) => b.style !== 'cancel');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android back button counts as "cancel" when there is one, matching the
      // native dialog's behaviour rather than silently confirming.
      onRequestClose={() => dismiss(cancel ?? (current.buttons.length === 1 ? current.buttons[0] : undefined))}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: enter,
              transform: [
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.card}>
            <View style={[styles.iconWell, tone === 'danger' && styles.iconWellDanger]}>
              <PetalIcon
                name={tone === 'danger' ? 'warning' : 'sparkle'}
                size={26}
                color={tone === 'danger' ? colors.error : colors.primary}
                filled
              />
            </View>

            <Text style={[typography.presets.title, styles.title]}>{current.title}</Text>
            {current.message ? (
              <Text style={[typography.presets.body, styles.message]}>{current.message}</Text>
            ) : null}

            <View style={styles.actions}>
              {actions.map((button, i) => (
                <PrimaryButton
                  key={`${button.text}-${i}`}
                  label={button.text ?? 'OK'}
                  tone={button.style === 'destructive' ? 'danger' : 'brand'}
                  onPress={() => dismiss(button)}
                />
              ))}
              {cancel ? (
                <SecondaryButton
                  label={cancel.text ?? 'Cancel'}
                  tone="neutral"
                  onPress={() => dismiss(cancel)}
                />
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // Warm rather than neutral black: a grey scrim over the pastel wallpapers
    // desaturates them into something drab behind the card.
    backgroundColor: 'rgba(42, 38, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    // Opaque, unlike the in-page cards: this one sits over a dimmed screen, and
    // letting the wallpaper read through it costs the message its contrast.
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconWellDanger: {
    backgroundColor: colors.errorLight,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
