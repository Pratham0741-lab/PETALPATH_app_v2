import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export const customAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: any
) => {
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
