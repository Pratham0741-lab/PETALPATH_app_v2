import { useState, useEffect, useCallback } from 'react';
import { cameraEngine } from '../CameraEngine';
import { PoseResultV1 } from '../types/PoseResultV1';
import { activityEngine } from '../../features/camera/engine/activityEngine';
import { poseTracker } from '../../features/camera/detection/poseTracker';
import { nativePoseDetector } from '../../features/camera/native/NativePoseDetector';
import { ActivityType, ActivityEngineResult } from '../../features/camera/types/pose.types';

export function useCameraEnginePipeline() {
  const [activeActivity, setActiveActivityState] = useState<ActivityType>('raise_hands');
  const [activityResult, setActivityResult] = useState<ActivityEngineResult>({
    activityType: 'raise_hands',
    state: 'searching',
    confidence: 0,
    feedback: 'Position yourself in front of the camera',
  });
  const [poseResult, setPoseResult] = useState<PoseResultV1 | null>(null);

  const setActiveActivity = useCallback((type: ActivityType) => {
    setActiveActivityState(type);
    activityEngine.setActivity(type);
    setActivityResult({
      activityType: type,
      state: 'searching',
      confidence: 0,
      feedback: `Stand in front of the camera to ${type.replace(/_/g, ' ')}`,
    });
  }, []);

  useEffect(() => {
    cameraEngine.start(activeActivity);

    const subscription = cameraEngine.onPoseResult((result: PoseResultV1) => {
      setPoseResult(result);

      const isPoseDetected = (result as any).poseDetected ?? (result.trackingState === 'tracking');
      const landmarksList = result.landmarks || [];
      const count = (result as any).landmarkCount ?? landmarksList.length;

      if (__DEV__) {
        console.log('[CameraEnginePipeline] Received native result:', {
          poseDetected: isPoseDetected,
          confidence: result.confidence,
          landmarkCount: count,
          timestamp: result.timestamp,
          firstLandmark: landmarksList.length > 0 ? landmarksList[0] : null,
          trackingState: result.trackingState,
          qualityScore: result.qualityScore,
        });
      }

      if (!isPoseDetected || landmarksList.length === 0) {
        setActivityResult({
          activityType: activeActivity,
          state: 'searching',
          confidence: 0,
          feedback: `Position yourself in front of the camera to ${activeActivity.replace(/_/g, ' ')}`,
        });
        return;
      }

      // Convert PoseResultV1 landmarks to PoseFrame for ActivityEngine evaluation
      const points3D = landmarksList.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
      }));

      const rawNativeResult = {
        poseDetected: true,
        confidence: result.confidence,
        inferenceTimeMs: result.metrics.inferenceTimeMs,
        landmarks: points3D,
        timestamp: result.timestamp,
      };

      const detectionRes = nativePoseDetector.processResult(rawNativeResult as any);
      if (detectionRes.detected && detectionRes.pose) {
        const smoothedPose = poseTracker.update(detectionRes.pose);
        const evalRes = activityEngine.evaluate(smoothedPose, poseTracker.getHistory());
        setActivityResult(evalRes);
      }
    });

    return () => {
      subscription.remove();
      cameraEngine.stop();
    };
  }, [activeActivity]);

  return {
    poseResult,
    activityResult,
    activeActivity,
    setActiveActivity,
  };
}
