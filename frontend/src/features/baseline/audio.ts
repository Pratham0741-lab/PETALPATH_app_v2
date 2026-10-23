/**
 * Plays the questionnaire's recorded prompts and sounds. Media paths in the
 * item bank are relative to the CDN; there is no text-to-speech in the app, so
 * a prompt is only heard once its audio file exists.
 */
import { UniversalAudioPlayer } from '../../utils/audioPlayer';
import { STORAGE_URL } from '../../config/api';

const CDN = (process.env.EXPO_PUBLIC_CDN_BASE_URL || STORAGE_URL).replace(/\/$/, '');

export const mediaUrl = (path: string | null | undefined): string | null =>
  path ? (/^https?:\/\//.test(path) ? path : `${CDN}/${path.replace(/^\/+/, '')}`) : null;

let current: UniversalAudioPlayer | null = null;

export function stopBaselineAudio(): void {
  try {
    current?.stop();
    current?.unload();
  } catch {
    /* already stopped */
  }
  current = null;
}

/** Plays the files one after another; a missing file is skipped. */
export function playSequence(paths: Array<string | null | undefined>, onDone?: () => void): void {
  stopBaselineAudio();
  const urls = paths.map(mediaUrl).filter((u): u is string => !!u);
  const next = (i: number) => {
    if (i >= urls.length) {
      current = null;
      onDone?.();
      return;
    }
    try {
      current = new UniversalAudioPlayer(urls[i], () => next(i + 1));
      current.play();
    } catch {
      next(i + 1);
    }
  };
  next(0);
}
