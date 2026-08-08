/**
 * Accessibility & Narration Service — PetalPath Core
 */

import { AccessibilityInfo, Platform } from 'react-native';

export class AccessibilityService {
  static announceForScreenReader(message: string): void {
    if (!message || message.startsWith('l10n:')) return;
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  static getScreenReaderLabel(
    keyOrText: string | null | undefined,
    fallback: string
  ): string {
    if (!keyOrText) return fallback;
    if (keyOrText.startsWith('l10n:')) {
      const parts = keyOrText.split(':');
      const last = parts[parts.length - 1];
      return last ? last.replace(/-/g, ' ') : fallback;
    }
    return keyOrText;
  }
}
