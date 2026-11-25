/**
 * Which recognizer and language a speaking activity uses, decided from what
 * the phone reports. Pure (no React Native imports) so it can be unit-tested;
 * utils/speechRecognition.ts gathers the probe and caches the plan.
 */
import {
  SPEECH_FALLBACK_LOCALE,
  SPEECH_LOCALES,
  UNAVAILABLE_ERROR_CODES,
  type SpeechRecognitionMode,
} from '../config/speech';

/** What the phone reported, gathered once. */
export interface SpeechProbe {
  /** The native module loaded (or, on web, the browser has SpeechRecognition). */
  readonly moduleLoaded: boolean;
  /** The phone's default recognizer can run at all. */
  readonly recognitionAvailable: boolean;
  /** On-device recognition is supported by this phone. */
  readonly onDeviceSupported: boolean;
  /** Languages downloaded for on-device recognition. */
  readonly installedLocales: readonly string[];
  /** Languages the default (possibly network) recognizer supports; may be empty if unknown. */
  readonly supportedLocales: readonly string[];
}

export interface SpeechPlan {
  readonly available: boolean;
  readonly onDevice: boolean;
  readonly lang: string;
}

export const UNAVAILABLE: SpeechPlan = { available: false, onDevice: false, lang: SPEECH_FALLBACK_LOCALE };

const norm = (l: string) => l.replace('_', '-').toLowerCase();

/** The first preferred language the phone has, or null. */
export function pickLocale(have: readonly string[], preferred: readonly string[] = SPEECH_LOCALES): string | null {
  const set = new Set(have.map(norm));
  return preferred.find((l) => set.has(norm(l))) ?? null;
}

function networkPlan(probe: SpeechProbe): SpeechPlan {
  if (!probe.recognitionAvailable) return UNAVAILABLE;
  // Unknown support list: still try, in the fallback language.
  const lang = pickLocale(probe.supportedLocales) ?? SPEECH_FALLBACK_LOCALE;
  return { available: true, onDevice: false, lang };
}

export function planSpeech(mode: SpeechRecognitionMode, probe: SpeechProbe): SpeechPlan {
  if (!probe.moduleLoaded) return UNAVAILABLE;
  const onDeviceLang = probe.onDeviceSupported ? pickLocale(probe.installedLocales) : null;
  const onDevicePlan: SpeechPlan | null = onDeviceLang ? { available: true, onDevice: true, lang: onDeviceLang } : null;

  switch (mode) {
    case 'on-device-only':
      return onDevicePlan ?? UNAVAILABLE;
    case 'prefer-on-device':
      return onDevicePlan ?? networkPlan(probe);
    case 'network':
    default:
      return networkPlan(probe);
  }
}

/** True for errors meaning "this phone can't do it" rather than "try again". */
export function isUnavailableError(error: unknown): boolean {
  const text = String((error as { message?: unknown; error?: unknown } | null)?.message ?? (error as { error?: unknown } | null)?.error ?? error ?? '');
  return UNAVAILABLE_ERROR_CODES.some((code) => text.includes(code));
}

/**
 * The plan after the recognizer refused with an "unavailable" error: an
 * on-device attempt falls back to the network when the mode allows it;
 * anything else means speech is not available on this phone.
 */
export function planAfterUnavailable(mode: SpeechRecognitionMode, failed: SpeechPlan, probe: SpeechProbe): SpeechPlan {
  if (!failed.available) return UNAVAILABLE;
  if (failed.onDevice && mode === 'prefer-on-device') return networkPlan(probe);
  // The network recognizer refused the preferred language: try the fallback once.
  if (!failed.onDevice && norm(failed.lang) !== norm(SPEECH_FALLBACK_LOCALE)) {
    return { available: true, onDevice: false, lang: SPEECH_FALLBACK_LOCALE };
  }
  return UNAVAILABLE;
}
