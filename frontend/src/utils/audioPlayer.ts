import { Platform } from 'react-native';

let createAudioPlayer: any = null;
if (Platform.OS !== 'web') {
  try {
    // Avoid importing expo-audio on web to prevent bundling/web-platform check errors
    createAudioPlayer = require('expo-audio').createAudioPlayer;
  } catch (e) {
    console.warn('Failed to load expo-audio createAudioPlayer:', e);
  }
}

export class UniversalAudioPlayer {
  private webAudio: HTMLAudioElement | null = null;
  private nativeSound: any = null;
  private onFinished: () => void = () => {};
  private onTimeUpdate: (position: number, duration: number) => void = () => {};
  private interval: any = null;
  private subscription: any = null;

  constructor(url: string, onFinished: () => void, onTimeUpdate?: (pos: number, dur: number) => void) {
    this.onFinished = onFinished;
    if (onTimeUpdate) this.onTimeUpdate = onTimeUpdate;

    if (Platform.OS === 'web') {
      this.webAudio = new window.Audio(url);
      this.webAudio.addEventListener('ended', () => {
        this.onFinished();
        this.stopPolling();
      });
    } else {
      if (createAudioPlayer) {
        try {
          this.nativeSound = createAudioPlayer({ uri: url });
          this.subscription = this.nativeSound.addListener('playbackStatusUpdate', (status: any) => {
            if (status) {
              if (status.didJustFinish) {
                this.onFinished();
                this.stopPolling();
              }
              // expo-audio currentTime and duration are in seconds
              this.onTimeUpdate(status.currentTime || 0, status.duration || 0);
            }
          });
        } catch (err: any) {
          console.warn('Failed to create native sound with expo-audio:', err);
        }
      }
    }
  }

  play() {
    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.play().catch(err => {
        console.warn('Web audio play blocked or failed:', err);
      });
      this.startPolling();
    } else if (this.nativeSound) {
      try {
        this.nativeSound.play();
        this.startPolling(); // Poll for native currentTime/duration too just in case status update has delays
      } catch (err: any) {
        console.warn('Native sound play failed:', err);
      }
    }
  }

  pause() {
    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.pause();
      this.stopPolling();
    } else if (this.nativeSound) {
      try {
        this.nativeSound.pause();
      } catch (err: any) {
        console.warn('Native sound pause failed:', err);
      }
      this.stopPolling();
    }
  }

  stop() {
    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.pause();
      this.webAudio.currentTime = 0;
      this.stopPolling();
    } else if (this.nativeSound) {
      try {
        this.nativeSound.stop();
      } catch (err: any) {
        console.warn('Native sound stop failed:', err);
      }
      this.stopPolling();
    }
  }

  unload() {
    this.stopPolling();
    if (this.webAudio) {
      this.webAudio.pause();
      this.webAudio = null;
    }
    if (this.subscription) {
      try {
        this.subscription.remove();
      } catch (err) {
        console.warn('Failed to remove audio listener:', err);
      }
      this.subscription = null;
    }
    if (this.nativeSound) {
      try {
        this.nativeSound.release();
      } catch (err: any) {
        console.warn('Failed to release expo-audio native player:', err);
      }
      this.nativeSound = null;
    }
  }

  private startPolling() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      if (Platform.OS === 'web' && this.webAudio) {
        this.onTimeUpdate(this.webAudio.currentTime, this.webAudio.duration || 0);
      } else if (this.nativeSound) {
        // Also poll properties directly from expo-audio player instance in case status events are throttled
        try {
          const current = this.nativeSound.currentTime || 0;
          const duration = this.nativeSound.duration || 0;
          this.onTimeUpdate(current, duration);
        } catch (e) {
          // ignore if properties aren't accessible
        }
      }
    }, 250);
  }

  private stopPolling() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

