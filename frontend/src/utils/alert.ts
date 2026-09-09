import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertRequest {
  /** Monotonic id so the host can key/replace without comparing content. */
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type AlertListener = (request: AlertRequest) => void;

/**
 * The in-app alert host, when one is mounted.
 *
 * `Alert.alert` draws the *operating system's* dialog — grey slab, Roboto, a
 * blue OK — which is the one surface in the app the design system cannot reach.
 * In a product whose whole visual language is soft, rounded and pastel, that
 * dialog reads as an error message from somewhere else.
 *
 * So the alert is a bridge rather than a direct call: `customAlert` publishes a
 * request, and `AppAlertHost` (mounted once at the root) renders it with the
 * app's own card, palette and Fredoka/Nunito type. The listener is deliberately
 * held here, in a module with no React or component imports, so the host can
 * import from `utils/alert` without a cycle.
 *
 * If no host is mounted — early startup, a screen rendered outside the
 * providers, a test — this falls back to the native dialog. An unstyled alert
 * is a far better failure than a silently swallowed one.
 */
let listener: AlertListener | null = null;
let nextId = 1;

export const registerAlertHost = (fn: AlertListener): (() => void) => {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
};

export const customAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: any
) => {
  // Every alert needs at least one way out, including the bare `customAlert(t, m)`
  // calls that relied on the OS supplying an implicit OK.
  const resolved: AlertButton[] = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];

  if (listener) {
    listener({ id: nextId++, title, message, buttons: resolved });
    return;
  }

  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // Check if it is a confirmation-style request (e.g., delete profile)
      const isConfirm = buttons.some(
        (b) =>
          b.style === 'destructive' ||
          b.text?.toLowerCase() === 'delete' ||
          b.text?.toLowerCase() === 'yes' ||
          b.text?.toLowerCase() === 'confirm'
      );

      if (isConfirm) {
        const result = window.confirm(`${title}\n\n${message || ''}`);
        if (result) {
          const primaryBtn =
            buttons.find((b) => b.style === 'destructive' || b.text?.toLowerCase() === 'delete') ||
            buttons.find((b) => b.style !== 'cancel') ||
            buttons[0];
          if (primaryBtn?.onPress) primaryBtn.onPress();
        } else {
          const cancelBtn = buttons.find((b) => b.style === 'cancel');
          if (cancelBtn?.onPress) cancelBtn.onPress();
        }
      } else {
        // Standard informational alert
        window.alert(`${title}\n\n${message || ''}`);
        // Execute the primary or first button callback
        const primaryBtn = buttons.find((b) => b.style !== 'cancel') || buttons[0];
        if (primaryBtn?.onPress) primaryBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message || ''}`);
    }
  } else {
    Alert.alert(title, message, buttons, options);
  }
};
