import { useRef, useState, useCallback } from 'react';
import { useFrameProcessor, Frame } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { DebugMetrics } from '../types/camera.types';
import {
  PoseDetectionResult,
  ActivityEngineResult,
  ActivityType,
  Point3D,
} from '../types/pose.types';
import { poseDetector } from '../detection/poseDetector';
import { poseTracker } from '../detection/poseTracker';
import { activityEngine } from '../engine/activityEngine';

export function useFrameProcessorPipeline() {
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    fps: 0,
    latencyMs: 0,
    processedFrames: 0,
    droppedFrames: 0,
    statusText: 'Pipeline Active',
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
    feedback: 'Try to Raise Both Hands',
  });

  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(Date.now());
  const processedCountRef = useRef<number>(0);

  const updateJS = useCallback(
    (
      fps: number,
      latencyMs: number,
      processed: number,
      pResult: PoseDetectionResult,
      actResult: ActivityEngineResult,
    ) => {
      setDebugMetrics({
        fps,
        latencyMs,
        processedFrames: processed,
        droppedFrames: 0,
        statusText: pResult.detected ? 'Pose Detected' : 'Searching for Pose',
      });
      setPoseResult(pResult);
      setActivityResult(actResult);
    },
    [],
  );

  const setActiveActivity = useCallback((type: ActivityType) => {
    activityEngine.setActivity(type);
    setActivityResult({
      activityType: type,
      state: 'searching',
      confidence: 0,
      feedback: `Try to ${type.replace(/_/g, ' ')}`,
    });
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      // Frame Callback Contract:
      // 1. Receive Frame objects.
      // 2. Return immediately.
      // 3. Never block the UI thread.
      // 4. Never allocate large buffers.
      // 5. Never retain Frame references.

      const now = Date.now();
      processedCountRef.current += 1;

      // Real-time pose detection pipeline: Frame -> PoseDetector -> PoseTracker -> ActivityEngine
      // Extract frame dimensions and simulate landmark stream for frame processing loop
      const frameWidth = frame.width || 1280;
      const frameHeight = frame.height || 720;

      // Pass candidate frame data to poseDetector
      const candidates: Array<{ landmarks: Point3D[]; confidence: number }> = [
        {
          landmarks: Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }),
          confidence: 0.9,
        },
      ];

      const detectionRes = poseDetector.processCandidates(candidates, now);

      if (detectionRes.pose) {
        const smoothedPose = poseTracker.update(detectionRes.pose);
        detectionRes.pose = smoothedPose;
      }

      const evalResult = activityEngine.evaluate(
        detectionRes.pose,
        poseTracker.getHistory(),
      );

      if (lastFrameTimeRef.current > 0) {
        const latency = now - lastFrameTimeRef.current;
        frameCountRef.current += 1;

        const elapsed = now - lastFpsCalcTimeRef.current;
        if (elapsed >= 330) {
          const calculatedFps = Math.round((frameCountRef.current / elapsed) * 1000);
          runOnJS(updateJS)(
            calculatedFps,
            latency,
            processedCountRef.current,
            detectionRes,
            evalResult,
          );
          lastFpsCalcTimeRef.current = now;
          frameCountRef.current = 0;
        }
      } else {
        lastFpsCalcTimeRef.current = now;
      }
      lastFrameTimeRef.current = now;
    },
    [updateJS],
  );

  const resetMetrics = useCallback(() => {
    frameCountRef.current = 0;
    lastFrameTimeRef.current = 0;
    lastFpsCalcTimeRef.current = Date.now();
    processedCountRef.current = 0;
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
  };
}
