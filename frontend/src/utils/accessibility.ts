import { PixelRatio } from 'react-native';

export const MIN_TOUCH_TARGET = 44;

export const accessibilityLabel = (
  label: string,
  hint?: string,
): { accessibilityLabel: string; accessibilityHint?: string } => {
  if (hint) {
    return { accessibilityLabel: label, accessibilityHint: hint };
  }
  return { accessibilityLabel: label };
};

export const fontScale = (size: number): number => {
  const scaleFactor = PixelRatio.getFontScale();
  return Math.round(size * scaleFactor);
};

export const ensureMinTouchTarget = (size: number): number => Math.max(size, MIN_TOUCH_TARGET);
