import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cameraEngine } from '../CameraEngine';
import { poseStream } from '../PoseStream';
import { CameraActivityAdapter } from '../integration/CameraActivityAdapter';
import { poseDiagnostics, EndToEndMetrics } from '../diagnostics/PoseDiagnostics';
import { activityEngine } from '../../features/camera/engine/activityEngine';
import { poseTracker } from '../../features/camera/detection/poseTracker';
import { ActivityType, ActivityEngineResult } from '../../features/camera/types/pose.types';

export function useCameraEnginePipeline() {
  const [activeActivity, setActiveActivityState] = useState<ActivityType>('raise_hands');
  const [activityResult, setActivityResult] = useState<ActivityEngineResult>({
    activityType: 'raise_hands',
    state: 'searching',
    confidence: 0,
    feedback: 'Stand in front of the camera to start!',
  });
  const [e2eMetrics, setE2EMetrics] = useState<EndToEndMetrics>({
    nativeInferenceMs: 0,
    bridgeLatencyMs: 0,
    evaluationMs: 0,
    totalRoundtripMs: 0,
  });

  const historyRef = useRef<any[]>([]);

  const activeActivityRef = useRef<ActivityType>(activeActivity);

  useEffect(() => {
    activeActivityRef.current = activeActivity;
  }, [activeActivity]);

  const setActiveActivity = useCallback((type: ActivityType, displayName?: string) => {
    setActiveActivityState(type);
    activityEngine.setActivity(type, displayName);
    setActivityResult({
      activityType: type,
      state: 'searching',
      confidence: 0,
      feedback: `Stand in front of the camera — ${displayName ?? type.replace(/_/g, ' ')}`,
    });
  }, []);

  const switchCamera = useCallback(async () => {
    return await cameraEngine.switchCamera();
  }, []);

  useEffect(() => {
    let isMounted = true;
    cameraEngine
      .start()
      .then((started) => {
        if (!started && isMounted) {
          console.warn('[useCameraEnginePipeline] Failed to start native camera engine.');
        }
      })
      .catch((err) => {
        console.error('[useCameraEnginePipeline] Error starting camera engine:', err);
      });

    const unsubscribe = poseStream.subscribe((frameV1) => {
      const currentActivity = activeActivityRef.current;
      const evalStart = Date.now();
      const adapted = CameraActivityAdapter.adaptToActivityPoseFrame(frameV1);

      if (!adapted) {
        setActivityResult({
          activityType: currentActivity,
          state: 'searching',
          confidence: 0,
          feedback: 'Stand in front of the camera!',
        });
        return;
      }

      if (adapted.trackingState !== 'TRACKING' && adapted.trackingState !== 'RECOVERING') {
        setActivityResult({
          activityType: currentActivity,
          state: 'searching',
          confidence: 0,
          feedback: adapted.feedbackText,
        });
        return;
      }

      const smoothedPose = poseTracker.update(adapted.poseFrame);
      historyRef.current.push(smoothedPose);
      if (historyRef.current.length > 30) historyRef.current.shift();

      const evalRes = activityEngine.evaluate(smoothedPose, historyRef.current);
      const evalEnd = Date.now();

      const metrics = poseDiagnostics.recordFrameEvaluation(
        frameV1.timestamp,
        frameV1.inferenceTime,
        evalStart,
        evalEnd
      );

      setE2EMetrics(metrics);
      setActivityResult(evalRes);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      cameraEngine.stop().catch(() => {});
    };
  }, []);

  return {
    activityResult,
    activeActivity,
    setActiveActivity,
    switchCamera,
    e2eMetrics,
  };
}
