import { useState, useEffect, useCallback } from 'react';
import { calibrationEngine } from './CalibrationEngine';
import { CalibrationProfile, CALIBRATION_CONFIG } from '../config/calibration';
import { PoseFrame } from '../types/pose.types';

export function useCalibration() {
  const [profile, setProfile] = useState<CalibrationProfile>(CALIBRATION_CONFIG.DEFAULT_PROFILE);
  const [isCalibrated, setIsCalibrated] = useState(false);

  useEffect(() => {
    calibrationEngine.loadProfile().then((loaded) => {
      setProfile(loaded);
      setIsCalibrated(loaded.calibrationDate > 0);
    });
  }, []);

  const calibrateFromPose = useCallback((frame: PoseFrame) => {
    const updated = calibrationEngine.calibrateFromFrame(frame);
    setProfile(updated);
  }, []);

  const saveCalibration = useCallback(async (customProfile?: CalibrationProfile) => {
    const target = customProfile || profile;
    await calibrationEngine.saveProfile(target);
    setIsCalibrated(true);
  }, [profile]);

  return {
    profile,
    isCalibrated,
    calibrateFromPose,
    saveCalibration,
  };
}
