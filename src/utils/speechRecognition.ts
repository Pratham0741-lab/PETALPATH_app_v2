import { Platform } from 'react-native';

let ExpoSR: any = null;
if (Platform.OS !== 'web') {
  try {
    ExpoSR = require('expo-speech-recognition');
  } catch (e) {
    console.warn('Failed to load expo-speech-recognition module:', e);
  }
}

export interface SpeechResult {
  transcript: string;
  confidence: number;
}

export class UniversalSpeechRecognizer {
  private webRecognition: any = null;
  private nativeResultListener: any = null;
  private nativeErrorListener: any = null;
  private isListening = false;

  constructor() {
    if (Platform.OS === 'web') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.webRecognition = new SpeechRecognition();
        this.webRecognition.continuous = false;
        this.webRecognition.interimResults = false;
        this.webRecognition.lang = 'en-US';
      }
    }
  }

  start(onResult: (res: SpeechResult) => void, onError: (err: any) => void) {
    if (this.isListening) return;
    this.isListening = true;

    if (Platform.OS === 'web') {
      if (this.webRecognition) {
        this.webRecognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence;
          onResult({ transcript, confidence });
          this.isListening = false;
        };
        this.webRecognition.onerror = (err: any) => {
          onError(err);
          this.isListening = false;
        };
        this.webRecognition.start();
      } else {
        onError(new Error('Web Speech Recognition not supported in this browser'));
        this.isListening = false;
      }
    } else {
      if (ExpoSR && ExpoSR.ExpoSpeechRecognitionModule) {
        ExpoSR.ExpoSpeechRecognitionModule.requestPermissionsAsync().then(({ granted }: any) => {
          if (!granted) {
            onError(new Error('Permission not granted'));
            this.isListening = false;
            return;
          }

          // Register event listener for results
          this.nativeResultListener = ExpoSR.ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
            if (event.results && event.results.length > 0) {
              const transcript = event.results[0].transcript;
              onResult({ transcript, confidence: 0.9 });
              this.cleanup();
            }
          });

          // Register event listener for errors
          this.nativeErrorListener = ExpoSR.ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
            onError(new Error(event?.error || 'Speech recognition error'));
            this.cleanup();
          });

          try {
            ExpoSR.ExpoSpeechRecognitionModule.start({
              lang: 'en-US',
              interimResults: false,
            });
          } catch (err: any) {
            onError(err);
            this.cleanup();
          }
        }).catch((err: any) => {
          onError(err);
          this.isListening = false;
        });
      } else {
        onError(new Error('Native Speech Recognition not loaded'));
        this.isListening = false;
      }
    }
  }

  private cleanup() {
    this.isListening = false;
    if (this.nativeResultListener) {
      try { this.nativeResultListener.remove(); } catch (_) {}
      this.nativeResultListener = null;
    }
    if (this.nativeErrorListener) {
      try { this.nativeErrorListener.remove(); } catch (_) {}
      this.nativeErrorListener = null;
    }
  }

  stop() {
    if (Platform.OS === 'web') {
      if (this.webRecognition) {
        try { this.webRecognition.stop(); } catch (_) {}
      }
    } else {
      if (ExpoSR && ExpoSR.ExpoSpeechRecognitionModule) {
        try { ExpoSR.ExpoSpeechRecognitionModule.abort(); } catch (_) {}
      }
    }
    this.cleanup();
  }
}

