import { useState, useEffect, useCallback, useRef } from 'react';
import { cameraEngine } from '../CameraEngine';
import { poseStream } from '../PoseStream';
import { CameraActivityAdapter } from '../integration/CameraActivityAdapter';
import { poseDiagnostics, EndToEndMetrics } from '../diagnostics/PoseDiagnostics';
import { activityEngine } from '../../features/camera/engine/activityEngine';
import { poseTracker } from '../../features/camera/detection/poseTracker';
import { setPoseMirrored } from '../../features/camera/validators/primitives';
import { ActivityType, ActivityEngineResult, PoseFrame } from '../../features/camera/types/pose.types';

/** Motion primitives look at ~1s of frames; 30 covers that at the 30fps target. */
const MAX_HISTORY_FRAMES = 30;

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

  const historyRef = useRef<PoseFrame[]>([]);

  const activeActivityRef = useRef<ActivityType>(activeActivity);

  useEffect(() => {
    activeActivityRef.current = activeActivity;
  }, [activeActivity]);

  /**
   * @param type          Coarse activity type, used for UI and telemetry.
   * @param displayName   The catalog title, so feedback names the activity the
   *   child was actually asked to do rather than the primitive.
   * @param validatorName The catalog's own validator. Without this every catalog
   *   activity had to be squeezed into one of eight poses.
   */
  const setActiveActivity = useCallback(
    (type: ActivityType, displayName?: string, validatorName?: string) => {
      setActiveActivityState(type);
      activityEngine.setActivity(type, displayName, validatorName);

      /**
       * Clear the motion window and the smoothing filter.
       *
       * Neither was reset before, so the frames captured while the child was
       * still doing the previous activity stayed in the buffer. A temporal
       * primitive reads that buffer, so switching from "Jump" to "Freeze like a
       * statue" could complete the freeze from the jump's leftover motion — or
       * fail it — before the child had moved at all. The EMA filter carried the
       * old body position across too, which pulled the first frames of the new
       * activity towards wherever the child had just been.
       */
      historyRef.current = [];
      poseTracker.reset();

      setActivityResult({
        activityType: type,
        state: 'searching',
        confidence: 0,
        feedback: `Stand in front of the camera — ${displayName ?? type.replace(/_/g, ' ')}`,
        validatorName,
        participationOnly: activityEngine.isParticipationOnly(),
      });
    },
    [],
  );

  /**
   * True while the front (selfie) camera is active, which is what
   * `CameraSession` opens with.
   */
  const mirroredRef = useRef<boolean>(true);

  useEffect(() => {
    setPoseMirrored(mirroredRef.current);
  }, []);

  const switchCamera = useCallback(async () => {
    const ok = await cameraEngine.switchCamera();

    if (ok) {
      /**
       * Keep the left/right primitives honest across a lens change.
       *
       * The native preprocessor mirrors front-camera frames before inference, so
       * MoveNet's anatomical labels are swapped relative to the child's real left
       * and right. The engine exposes no facing getter, so the flag is tracked
       * here — starting from front, because that is what `CameraSession` opens
       * with — and only the side-specific activities ("Raise left hand") depend
       * on it.
       */
      mirroredRef.current = !mirroredRef.current;
      setPoseMirrored(mirroredRef.current);

      // The mirrored view is a different geometry; stale frames would blend the two.
      historyRef.current = [];
      poseTracker.reset();
    }

    return ok;
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
        /**
         * Tracking is not usable, so drop the motion window. Keeping it would let
         * frames from before the child walked out of shot join up with frames
         * from after they came back, and read as movement in between.
         */
        historyRef.current = [];
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
      if (historyRef.current.length > MAX_HISTORY_FRAMES) historyRef.current.shift();

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
