/**
 * Audio Guide Service
 *
 * Thin wrapper around UniversalAudioPlayer for guide-specific playback.
 * Manages a single active player instance — stops previous before starting next.
 */

import { UniversalAudioPlayer } from '../utils/audioPlayer';
import { getGuideUrl, GuideKey } from '../constants/audioGuideMap';

let currentPlayer: UniversalAudioPlayer | null = null;
let currentGuideKey: GuideKey | null = null;
let currentCharacterType: string | null = null;
let currentVolume = 0.8;

/**
 * Stop any currently playing guide audio.
 */
export const stopGuide = (): void => {
  if (currentPlayer) {
    try {
      currentPlayer.stop();
      currentPlayer.unload();
    } catch (err) {
      console.warn('[AudioGuide] stop error:', err);
    }
    currentPlayer = null;
  }
};

/**
 * Play a guide audio for a given mentor + guide key.
 * Stops any previously playing guide first.
 *
 * Returns `true` if audio started, `false` if the file doesn't exist.
 */
export const playGuide = (
  characterType: string,
  guideKey: GuideKey,
  onFinished?: () => void,
): boolean => {
  // Stop any existing playback
  stopGuide();

  const url = getGuideUrl(characterType, guideKey);
  if (!url) {
    console.log(`[AudioGuide] No audio file for ${guideKey} (placeholder)`);
    // Still invoke callback so tutorial flow continues
    onFinished?.();
    return false;
  }

  currentGuideKey = guideKey;
  currentCharacterType = characterType;

  try {
    currentPlayer = new UniversalAudioPlayer(
      url,
      () => {
        // Playback finished
        currentPlayer = null;
        onFinished?.();
      },
    );
    currentPlayer.play();
    console.log(`[AudioGuide] Playing: ${guideKey} for ${characterType}`);
    return true;
  } catch (err) {
    console.warn('[AudioGuide] playGuide error:', err);
    onFinished?.();
    return false;
  }
};

/**
 * Replay the last played guide audio.
 * Returns false if nothing was previously played.
 */
export const replayGuide = (onFinished?: () => void): boolean => {
  if (!currentCharacterType || !currentGuideKey) {
    console.log('[AudioGuide] Nothing to replay');
    return false;
  }
  return playGuide(currentCharacterType, currentGuideKey, onFinished);
};

/**
 * Set the volume for guide playback (0-1).
 * Note: Volume control is applied to future playback. The built-in
 * UniversalAudioPlayer doesn't expose volume controls, so this is
 * stored as a preference for future enhancement.
 */
export const setGuideVolume = (volume: number): void => {
  currentVolume = Math.max(0, Math.min(1, volume));
};

/**
 * Get current volume setting.
 */
export const getGuideVolume = (): number => {
  return currentVolume;
};

/**
 * Check if a guide is currently playing.
 */
export const isGuidePlaying = (): boolean => {
  return currentPlayer !== null;
};

/**
 * Get the currently playing guide key, or null.
 */
export const getCurrentGuideKey = (): GuideKey | null => {
  return currentGuideKey;
};

/**
 * Preload a guide audio (web only — creates an Audio element to cache).
 * On native this is a no-op.
 */
export const preloadGuide = (characterType: string, guideKey: GuideKey): void => {
  const url = getGuideUrl(characterType, guideKey);
  if (!url) return;

  if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
    try {
      const audio = new window.Audio();
      audio.preload = 'auto';
      audio.src = url;
    } catch {
      // Ignore preload failures
    }
  }
};
