import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalibrationProfile, CALIBRATION_CONFIG } from '../config/calibration';
import { PoseFrame } from '../types/pose.types';

export class CalibrationEngine {
  private currentProfile: CalibrationProfile = CALIBRATION_CONFIG.DEFAULT_PROFILE;
  private isLoaded = false;

  public async loadProfile(): Promise<CalibrationProfile> {
    try {
      const raw = await AsyncStorage.getItem(CALIBRATION_CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CalibrationProfile;
        // Migration check for version
        if (parsed.version === CALIBRATION_CONFIG.VERSION) {
          this.currentProfile = parsed;
        }
      }
    } catch {
      this.currentProfile = CALIBRATION_CONFIG.DEFAULT_PROFILE;
    }
    this.isLoaded = true;
    return this.currentProfile;
  }

  public getProfile(): CalibrationProfile {
    return this.currentProfile;
  }

  public calibrateFromFrame(frame: PoseFrame): CalibrationProfile {
    const { landmarks } = frame;
    const lSh = landmarks.leftShoulder;
    const rSh = landmarks.rightShoulder;

    if (lSh && rSh && (lSh.visibility ?? 0) > 0.5 && (rSh.visibility ?? 0) > 0.5) {
      const dx = rSh.x - lSh.x;
      const dy = rSh.y - lSh.y;
      const measuredWidth = Math.sqrt(dx * dx + dy * dy);

      const boundedWidth = Math.max(
        CALIBRATION_CONFIG.BOUNDS.MIN_SHOULDER_WIDTH,
        Math.min(CALIBRATION_CONFIG.BOUNDS.MAX_SHOULDER_WIDTH, measuredWidth),
      );

      this.currentProfile = {
        version: CALIBRATION_CONFIG.VERSION,
        calibrationDate: Date.now(),
        shoulderWidth: boundedWidth,
        movementRange: boundedWidth * 2.0,
        preferredDistance: 1.5,
        deviceOrientation: 'portrait',
      };
    }
    return this.currentProfile;
  }

  public async saveProfile(profile: CalibrationProfile = this.currentProfile): Promise<void> {
    this.currentProfile = profile;
    await AsyncStorage.setItem(CALIBRATION_CONFIG.STORAGE_KEY, JSON.stringify(profile));
  }
}

export const calibrationEngine = new CalibrationEngine();
