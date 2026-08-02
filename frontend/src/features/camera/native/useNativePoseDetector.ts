import { useState, useEffect, useCallback } from 'react';
import { nativePoseDetector } from './NativePoseDetector';
import { PoseDetectorConfig, DetectorMetrics, RawNativePoseResult } from './types';
import { PoseDetectionResult } from '../types/pose.types';

export function useNativePoseDetector(config: PoseDetectorConfig = {}) {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<DetectorMetrics>({
    inferenceTimeMs: 0,
    fps: 0,
    delegateUsed: config.delegate || 'AUTO',
    modelLoaded: false,
    droppedFramesCount: 0,
  });

  useEffect(() => {
    let isMounted = true;

    nativePoseDetector.initialize(config).then((success) => {
      if (isMounted) {
        setIsReady(success);
        setMetrics(nativePoseDetector.getMetrics());
      }
    });

    return () => {
      isMounted = false;
      nativePoseDetector.dispose();
    };
  }, [config.modelType, config.delegate, config.runningMode]);

  const processNativeResult = useCallback((rawResult: any) => {
    const res = nativePoseDetector.processResult(rawResult);
    setMetrics(nativePoseDetector.getMetrics());
    return res;
  }, []);

  return {
    isReady,
    metrics,
    processNativeResult,
    detector: nativePoseDetector,
  };
}
