export interface AccessibilitySettings {
  muteVoiceGuidance: boolean;
  disableAnimations: boolean;
  slowCountdown: boolean;
  highContrast: boolean;
}

export const ACCESSIBILITY_CONFIG: AccessibilitySettings = {
  muteVoiceGuidance: false,
  disableAnimations: false,
  slowCountdown: false,
  highContrast: false,
};
