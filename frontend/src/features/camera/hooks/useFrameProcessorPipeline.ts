import { useState, useCallback, useMemo } from 'react';
import { useFrameProcessor, Frame } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { DebugMetrics } from '../types/camera.types';
import {
  PoseDetectionResult,
  ActivityEngineResult,
  ActivityType,
} from '../types/pose.types';
import { poseTracker } from '../detection/poseTracker';
import { activityEngine } from '../engine/activityEngine';
import {
  useNativePoseDetector,
  initMediaPipePlugin,
  nativePoseDetector,
  RawNativePoseResult,
} from '../native';

/**
 * Google Native MediaPipe Pose Detection Pipeline (Event-Driven)
 *
 * Driven STRICTLY by VisionCamera native frame processor plugin ('detectPose').
 * Zero synthetic landmark generation. Zero simulation timers.
 * Real camera frames drive Pose Tracker -> Activity Engine -> Rules Engine -> UI.
 */
export function useFrameProcessorPipeline() {
  const { isReady } = useNativePoseDetector({
    modelType: 'lite',
    runningMode: 'LIVE_STREAM',
    delegate: 'AUTO',
  });

  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    fps: 0,
    latencyMs: 0,
    processedFrames: 0,
    droppedFrames: 0,
    statusText: 'MediaPipe Pipeline Active',
  });

  const [poseResult, setPoseResult] = useState<PoseDetectionResult>({
    detected: false,
    pose: null,
    confidence: 0,
    landmarkCount: 0,
  });

  const [activityResult, setActivityResult] = useState<ActivityEngineResult>({
    activityType: 'raise_hands',
    state: 'searching',
    confidence: 0,
    feedback: 'Position yourself in front of the camera',
  });

  // Safely initialize native VisionCamera JSI Frame Processor Plugin
  const detectPlugin = useMemo(() => {
    const plugin = initMediaPipePlugin();
    if (__DEV__) {
      console.log('detectPlugin =', plugin != null ? 'VALID HOST OBJECT ✅' : 'NULL ❌');
    }
    return plugin;
  }, []);

  // ── Event-Driven Native MediaPipe Result Processor ────────────────
  const handleNativePoseResult = useCallback((rawResult: RawNativePoseResult) => {
    if (!rawResult) return;

    // Stage 9: JS Callback Verification & Detailed Logging
    if (__DEV__) {
      console.log('Received native result:', {
        poseDetected: rawResult.poseDetected,
        confidence: rawResult.confidence,
        landmarkCount: rawResult.landmarks?.length ?? 0,
      });
    }

    // Stage 10: Convert & Validate raw native keypoints
    const detectionRes = nativePoseDetector.processResult(rawResult);
    const nativeMetrics = nativePoseDetector.getMetrics();

    if (__DEV__) {
      console.log('[Pipeline Stage 10] NativePoseDetector result:', {
        detected: detectionRes.detected,
        confidence: detectionRes.confidence,
        landmarkCount: detectionRes.landmarkCount,
      });
    }

    // Fail Safely: If no valid pose is detected, update UI state to Searching
    if (!detectionRes.detected || !detectionRes.pose) {
      const activeType = activityEngine.getActiveActivity();
      const label = activeType.replace(/_/g, ' ');

      if (__DEV__) {
        console.log('[Pipeline Stage 10 WHY] Pose NOT detected:', {
          poseDetected: rawResult?.poseDetected,
          confidence: rawResult?.confidence,
          landmarkCount: rawResult?.landmarks?.length ?? 0,
          reason: !rawResult?.poseDetected
            ? 'MediaPipe returned zero poses / no person in view'
            : !rawResult?.landmarks || rawResult.landmarks.length !== 33
            ? `Invalid landmark count (${rawResult?.landmarks?.length} != 33)`
            : 'Confidence below threshold or keypoint validation failed',
        });
      }

      setPoseResult({
        detected: false,
        pose: null,
        confidence: 0,
        landmarkCount: 0,
      });
      setActivityResult({
        activityType: activeType,
        state: 'searching',
        confidence: 0,
        feedback: `Stand in front of the camera to ${label}`,
      });
      setDebugMetrics({
        fps: nativeMetrics.fps,
        latencyMs: nativeMetrics.inferenceTimeMs,
        processedFrames: nativeMetrics.fps,
        droppedFrames: nativeMetrics.droppedFramesCount,
        statusText: 'Searching for Pose...',
      });
      return;
    }

    // Stage 11: Update PoseTracker & ActivityEngine
    const smoothedPose = poseTracker.update(detectionRes.pose);
    detectionRes.pose = smoothedPose;

    const evalResult = activityEngine.evaluate(
      smoothedPose,
      poseTracker.getHistory(),
    );

    if (__DEV__) {
      console.log('[Pipeline Stage 11] ActivityEngine evaluation:', {
        activity: evalResult.activityType,
        state: evalResult.state,
        feedback: evalResult.feedback,
      });
    }

    setPoseResult(detectionRes);
    setActivityResult(evalResult);
    setDebugMetrics({
      fps: nativeMetrics.fps,
      latencyMs: nativeMetrics.inferenceTimeMs,
      processedFrames: nativeMetrics.fps,
      droppedFrames: nativeMetrics.droppedFramesCount,
      statusText: 'MediaPipe Pose Identified ✅',
    });
  }, []);

  // Thread Hop Hook: Safely hop from VisionCamera Worklet to JS Thread
  const runOnJS = useRunOnJS(handleNativePoseResult, [handleNativePoseResult]);

  // ── VisionCamera Worklet Frame Processor (Zero Bridge Copy) ──────
  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      // Step 5: Verify Frame Processor worklet actually runs
      console.log('FRAME PROCESSOR RUNNING, timestamp:', frame.timestamp);

      if (detectPlugin != null && typeof (detectPlugin as any).call === 'function') {
        // Step 6: Invoke native plugin call
        console.log('CALLING NATIVE DETECT PLUGIN...');
        const nativeResult = (detectPlugin as any).call(frame) as RawNativePoseResult | null;
        
        if (nativeResult != null) {
          const firstLm = (nativeResult.landmarks && nativeResult.landmarks.length > 0)
            ? nativeResult.landmarks[0]
            : null;

          console.log(
            'Native Result:\n' +
            'poseDetected = ' + nativeResult.poseDetected + '\n' +
            'confidence = ' + nativeResult.confidence + '\n' +
            'landmarkCount = ' + (nativeResult.landmarks ? nativeResult.landmarks.length : 0) + '\n' +
            'timestamp = ' + nativeResult.timestamp + '\n' +
            'first landmark = ' + (firstLm ? ('{"x":' + firstLm.x + ',"y":' + firstLm.y + ',"z":' + firstLm.z + '}') : 'null')
          );

          runOnJS(nativeResult);
        } else {
          console.log('NATIVE RESULT IS NULL from detectPlugin.call(frame)');
        }
      } else {
        console.log('detectPlugin IS NULL - PLUGIN NOT REGISTERED!');
      }
    },
    [detectPlugin, runOnJS],
  );

  const setActiveActivity = useCallback((type: ActivityType) => {
    activityEngine.setActivity(type);
    setActivityResult({
      activityType: type,
      state: 'searching',
      confidence: 0,
      feedback: `Stand in front of the camera to ${type.replace(/_/g, ' ')}`,
    });
  }, []);

  const resetMetrics = useCallback(() => {
    poseTracker.reset();
    activityEngine.reset();
    setDebugMetrics({
      fps: 0,
      latencyMs: 0,
      processedFrames: 0,
      droppedFrames: 0,
      statusText: 'Pipeline Reset',
    });
  }, []);

  return {
    frameProcessor,
    debugMetrics,
    poseResult,
    activityResult,
    activeActivity: activityEngine.getActiveActivity(),
    setActiveActivity,
    resetMetrics,
    isNativeReady: isReady,
  };
}
