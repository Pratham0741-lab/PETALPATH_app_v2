/**
 * Speech recognition policy for speaking activities (utils/speechRecognition).
 *
 * Modes:
 *  - 'on-device-only'   audio never leaves the phone; phones without on-device
 *                       recognition (or without an English model installed)
 *                       cannot score speech, and the activity offers a skip.
 *  - 'prefer-on-device' on-device where the phone supports it, otherwise the
 *                       phone's default recognizer, which may send audio to
 *                       Google's servers. Declare that in Play Data safety.
 *  - 'network'          always the phone's default recognizer.
 *
 * On Android, on-device recognition needs Android 13+ and Google's on-device
 * recognizer (Android System Intelligence) with the language downloaded.
 */
export type SpeechRecognitionMode = 'on-device-only' | 'prefer-on-device' | 'network';

export const SPEECH_RECOGNITION_MODE: SpeechRecognitionMode = 'prefer-on-device';

/** Languages in order of preference; the first one the phone has is used. */
export const SPEECH_LOCALES: readonly string[] = ['en-IN', 'en-US'];

/** Used when the phone reports none of SPEECH_LOCALES. */
export const SPEECH_FALLBACK_LOCALE = 'en-US';

/** Google's on-device recognition service on Android. */
export const ON_DEVICE_SERVICE_PACKAGE = 'com.google.android.as';

/** Recognizer error codes meaning "not available on this phone", not "try again". */
export const UNAVAILABLE_ERROR_CODES: readonly string[] = ['language-not-supported', 'service-not-allowed'];
