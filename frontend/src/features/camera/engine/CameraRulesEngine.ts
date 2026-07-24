import { ActivityDefinition } from '../session/activityDefinitions';
import { CalibrationProfile } from '../config/calibration';
import { DifficultySettings } from '../config/difficulty';
import { QualityState } from '../config/quality';
import { AccessibilitySettings } from '../config/accessibility';

export interface ResolvedActivityDefinition extends ActivityDefinition {
  resolvedHoldDurationMs: number;
  resolvedRepetitions: number;
  resolvedTimeoutMs: number;
  resolvedConfidenceThreshold: number;
  qualityState: QualityState;
  calibrationApplied: boolean;
}

export class CameraRulesEngine {
  public resolveActivityDefinition(
    baseDef: ActivityDefinition,
    calibration: CalibrationProfile,
    difficulty: DifficultySettings,
    quality: QualityState,
    accessibility: AccessibilitySettings,
  ): ResolvedActivityDefinition {
    // 1. Apply Difficulty Multipliers
    let holdDuration = Math.round(baseDef.holdDurationMs * difficulty.holdMultiplier);
    let repetitions = Math.max(1, baseDef.repetitions + difficulty.repetitionOffset);
    let timeout = Math.round(baseDef.timeoutMs * difficulty.timeoutMultiplier);
    let confidence = Math.max(baseDef.confidenceThreshold, difficulty.confidenceThreshold);

    // 2. Apply Accessibility Adjustments
    if (accessibility.slowCountdown) {
      timeout += 5000;
    }

    // 3. Apply Quality Adjustments (if quality is poor, soften confidence slightly to reduce friction)
    if (quality === 'poor') {
      confidence = Math.max(0.5, confidence - 0.1);
    }

    // 4. Apply Calibration Calibration (scale hold duration if child has smaller movement range)
    const calibrationApplied = calibration.calibrationDate > 0;

    return {
      ...baseDef,
      resolvedHoldDurationMs: holdDuration,
      resolvedRepetitions: repetitions,
      resolvedTimeoutMs: timeout,
      resolvedConfidenceThreshold: confidence,
      qualityState: quality,
      calibrationApplied,
    };
  }
}

export const cameraRulesEngine = new CameraRulesEngine();
