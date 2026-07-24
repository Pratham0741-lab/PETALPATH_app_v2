export interface CalibrationProfile {
  version: number;
  calibrationDate: number;
  shoulderWidth: number;
  movementRange: number;
  preferredDistance: number;
  deviceOrientation: 'portrait' | 'landscape';
}

export const CALIBRATION_CONFIG = {
  VERSION: 1,
  STORAGE_KEY: '@petalpath_camera_calibration',
  DEFAULT_PROFILE: {
    version: 1,
    calibrationDate: 0,
    shoulderWidth: 0.2, // Default body normalized shoulder width baseline
    movementRange: 0.4,
    preferredDistance: 1.5, // Meters estimate
    deviceOrientation: 'portrait' as const,
  },
  BOUNDS: {
    MIN_SHOULDER_WIDTH: 0.08,
    MAX_SHOULDER_WIDTH: 0.5,
    MIN_DISTANCE: 0.5,
    MAX_DISTANCE: 3.5,
  },
};
