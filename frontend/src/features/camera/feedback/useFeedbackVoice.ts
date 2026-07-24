import { useCallback, useRef } from 'react';
import { CameraAccessibility } from '../config/CameraAccessibility';

export function useFeedbackVoice() {
  const lastSpokenRef = useRef<string>('');

  const speakInstruction = useCallback((text: string) => {
    if (CameraAccessibility.muteVoiceGuidance) return;
    if (!text || text === lastSpokenRef.current) return;

    lastSpokenRef.current = text;
    try {
      // Dynamic require check for expo-speech if installed
      const Speech = require('expo-speech');
      if (Speech && typeof Speech.speak === 'function') {
        Speech.stop();
        Speech.speak(text, {
          language: 'en-US',
          pitch: 1.1,
          rate: 0.95,
        });
      }
    } catch {
      // Ignore if speech module is unavailable
    }
  }, []);

  const stopVoice = useCallback(() => {
    try {
      const Speech = require('expo-speech');
      if (Speech && typeof Speech.stop === 'function') {
        Speech.stop();
      }
    } catch {
      // Ignore
    }
  }, []);

  return {
    speakInstruction,
    stopVoice,
  };
}
