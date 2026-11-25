/**
 * Speech recognition for speaking activities.
 *
 * Which recognizer and language to use comes from config/speech.ts
 * (SPEECH_RECOGNITION_MODE) and what the phone supports. The phone is probed
 * once per app run and the plan cached (utils/speechPlan.ts decides):
 *  - on-device recognition when the phone has it with an English model
 *    (en-IN preferred, then en-US), so audio stays on the phone;
 *  - otherwise, in 'prefer-on-device' or 'network' mode, the phone's default
 *    recognizer, which may send audio to Google's servers.
 * If the recognizer answers "language-not-supported" or "service-not-allowed",
 * the plan is downgraded (on-device -> network, en-IN -> en-US) and the same
 * attempt retried; when nothing is left, the error is SPEECH_UNAVAILABLE and
 * the activity offers a skip.
 */
import { Platform } from 'react-native';
import { ON_DEVICE_SERVICE_PACKAGE, SPEECH_RECOGNITION_MODE } from '../config/speech';
import {
  UNAVAILABLE,
  isUnavailableError,
  planAfterUnavailable,
  planSpeech,
  type SpeechPlan,
  type SpeechProbe,
} from './speechPlan';

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

let ExpoSR: any = null;
if (Platform.OS !== 'web') {
  try {
    ExpoSR = require('expo-speech-recognition');
  } catch (e) {
    if (IS_DEV) console.warn('Failed to load expo-speech-recognition module:', e);
  }
}

export interface SpeechResult {
  transcript: string;
  confidence: number;
}

/** Message of the error passed to onError when speech can't work on this phone. */
export const SPEECH_UNAVAILABLE = 'speech-unavailable';

const webRecognitionClass = (): any =>
  Platform.OS === 'web' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

async function probePhone(): Promise<SpeechProbe> {
  if (Platform.OS === 'web') {
    const available = !!webRecognitionClass();
    return { moduleLoaded: available, recognitionAvailable: available, onDeviceSupported: false, installedLocales: [], supportedLocales: [] };
  }
  const mod = ExpoSR?.ExpoSpeechRecognitionModule;
  if (!mod) {
    return { moduleLoaded: false, recognitionAvailable: false, onDeviceSupported: false, installedLocales: [], supportedLocales: [] };
  }
  const safe = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  const recognitionAvailable = safe(() => !!mod.isRecognitionAvailable(), false);
  const onDeviceSupported = safe(() => !!mod.supportsOnDeviceRecognition(), false);

  let installedLocales: string[] = [];
  if (onDeviceSupported) {
    try {
      const res = await mod.getSupportedLocales(
        Platform.OS === 'android' ? { androidRecognitionServicePackage: ON_DEVICE_SERVICE_PACKAGE } : {},
      );
      installedLocales = Platform.OS === 'android' ? res?.installedLocales ?? [] : res?.locales ?? [];
    } catch {
      /* treat as none installed */
    }
  }
  let supportedLocales: string[] = [];
  try {
    supportedLocales = (await mod.getSupportedLocales({}))?.locales ?? [];
  } catch {
    /* unknown: the plan falls back to en-US */
  }
  return { moduleLoaded: true, recognitionAvailable, onDeviceSupported, installedLocales, supportedLocales };
}

let probe: Promise<SpeechProbe> | null = null;
let plan: Promise<SpeechPlan> | null = null;

/** The current plan; the phone is probed once per app run. */
export function getSpeechPlan(): Promise<SpeechPlan> {
  if (!probe) probe = probePhone();
  if (!plan) plan = probe.then((p) => planSpeech(SPEECH_RECOGNITION_MODE, p)).catch(() => UNAVAILABLE);
  return plan;
}

/** True when speech recognition can be attempted on this phone. */
export async function isSpeechAvailable(): Promise<boolean> {
  return (await getSpeechPlan()).available;
}

/** After an "unavailable" refusal: the next plan to try (cached for the rest of the run). */
async function downgrade(failed: SpeechPlan): Promise<SpeechPlan> {
  const p = await (probe ?? (probe = probePhone()));
  const next = planAfterUnavailable(SPEECH_RECOGNITION_MODE, failed, p);
  plan = Promise.resolve(next);
  return next;
}

export class UniversalSpeechRecognizer {
  private webRecognition: any = null;
  private nativeResultListener: any = null;
  private nativeErrorListener: any = null;
  private isListening = false;

  start(onResult: (res: SpeechResult) => void, onError: (err: any) => void) {
    if (this.isListening) return;
    this.isListening = true;
    void this.run(onResult, onError);
  }

  private async run(onResult: (res: SpeechResult) => void, onError: (err: any) => void) {
    let current = await getSpeechPlan();
    // Each refusal moves down the plan (on-device -> network -> en-US); bounded.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!this.isListening) return; // stop() was called
      if (!current.available) break;
      const outcome = await this.listenOnce(current);
      if (!this.isListening) return; // stopped while listening: stay quiet
      if (outcome.kind === 'result') {
        this.cleanup();
        onResult(outcome.result);
        return;
      }
      if (isUnavailableError(outcome.error)) {
        if (IS_DEV) console.warn('[speech] unavailable with', current, '-> downgrading');
        current = await downgrade(current);
        continue;
      }
      this.cleanup();
      onError(outcome.error);
      return;
    }
    this.cleanup();
    onError(new Error(SPEECH_UNAVAILABLE));
  }

  /** One recognition attempt with a given plan. */
  private listenOnce(
    p: SpeechPlan,
  ): Promise<{ kind: 'result'; result: SpeechResult } | { kind: 'error'; error: any }> {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        const Recognition = webRecognitionClass();
        if (!Recognition) return resolve({ kind: 'error', error: new Error(SPEECH_UNAVAILABLE) });
        this.webRecognition = new Recognition();
        this.webRecognition.continuous = false;
        this.webRecognition.interimResults = false;
        this.webRecognition.lang = p.lang;
        this.webRecognition.onresult = (event: any) => {
          resolve({
            kind: 'result',
            result: { transcript: event.results[0][0].transcript, confidence: event.results[0][0].confidence },
          });
        };
        this.webRecognition.onerror = (err: any) => {
          resolve({ kind: 'error', error: new Error(err?.error || 'Speech recognition error') });
        };
        try {
          this.webRecognition.start();
        } catch (err) {
          resolve({ kind: 'error', error: err });
        }
        return;
      }

      const mod = ExpoSR?.ExpoSpeechRecognitionModule;
      if (!mod) return resolve({ kind: 'error', error: new Error(SPEECH_UNAVAILABLE) });

      mod
        .requestPermissionsAsync()
        .then(({ granted }: any) => {
          if (!granted) {
            return resolve({ kind: 'error', error: new Error('Permission not granted') });
          }
          this.cleanupListeners();
          this.nativeResultListener = mod.addListener('result', (event: any) => {
            if (event.results && event.results.length > 0) {
              this.cleanupListeners();
              resolve({ kind: 'result', result: { transcript: event.results[0].transcript, confidence: 0.9 } });
            }
          });
          this.nativeErrorListener = mod.addListener('error', (event: any) => {
            this.cleanupListeners();
            resolve({ kind: 'error', error: new Error(event?.error || 'Speech recognition error') });
          });
          try {
            mod.start({
              lang: p.lang,
              interimResults: false,
              requiresOnDeviceRecognition: p.onDevice,
              ...(p.onDevice && Platform.OS === 'android'
                ? { androidRecognitionServicePackage: ON_DEVICE_SERVICE_PACKAGE }
                : {}),
            });
          } catch (err) {
            this.cleanupListeners();
            resolve({ kind: 'error', error: err });
          }
        })
        .catch((err: any) => {
          resolve({ kind: 'error', error: err });
        });
    });
  }

  private cleanupListeners() {
    if (this.nativeResultListener) {
      try { this.nativeResultListener.remove(); } catch (_) {}
      this.nativeResultListener = null;
    }
    if (this.nativeErrorListener) {
      try { this.nativeErrorListener.remove(); } catch (_) {}
      this.nativeErrorListener = null;
    }
  }

  private cleanup() {
    this.isListening = false;
    this.cleanupListeners();
  }

  stop() {
    if (Platform.OS === 'web') {
      if (this.webRecognition) {
        try { this.webRecognition.stop(); } catch (_) {}
      }
    } else if (ExpoSR?.ExpoSpeechRecognitionModule) {
      try { ExpoSR.ExpoSpeechRecognitionModule.abort(); } catch (_) {}
    }
    this.cleanup();
  }
}
