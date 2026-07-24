import { CameraRulesEngine } from '../engine/CameraRulesEngine';
import { AdaptiveDifficultyEngine } from '../adaptive/AdaptiveDifficultyEngine';
import { SessionQualityEngine } from '../quality/SessionQualityEngine';
import { ProgressInsightsEngine } from '../progress/ProgressInsights';
import { getActivityDefinition } from '../session/activityDefinitions';
import { CALIBRATION_CONFIG } from '../config/calibration';
import { ACCESSIBILITY_CONFIG } from '../config/accessibility';

export function runAdaptiveEngineVerification(): boolean {
  // 1. Adaptive Difficulty Guardrails Test
  const diffEngine = new AdaptiveDifficultyEngine();
  diffEngine.setMode('adaptive');

  // Record 3 consecutive successes to trigger rank up
  diffEngine.recordAttempt(true);
  diffEngine.recordAttempt(true);
  const updatedMode = diffEngine.recordAttempt(true);
  if (updatedMode !== 'advanced') return false;

  // 2. Camera Rules Engine Resolution Test
  const rulesEngine = new CameraRulesEngine();
  const baseDef = getActivityDefinition('raise_hands');
  const diffSettings = diffEngine.getSettings('easy');

  const resolved = rulesEngine.resolveActivityDefinition(
    baseDef,
    CALIBRATION_CONFIG.DEFAULT_PROFILE,
    diffSettings,
    'good',
    ACCESSIBILITY_CONFIG,
  );

  // Easy mode has 0.6x hold multiplier -> 1500 * 0.6 = 900
  if (resolved.resolvedHoldDurationMs !== 900) return false;

  // 3. Quality Hysteresis Test
  const qualityEngine = new SessionQualityEngine();
  // Frame with no landmarks should yield 'poor'
  const qState = qualityEngine.evaluateFrameQuality(null);
  if (qState !== 'poor') return false;

  // 4. Progress Insights Engine Test
  const insightsEngine = new ProgressInsightsEngine();
  const metrics = insightsEngine.computeRawMetrics([
    {
      completionId: 'test_1',
      lessonId: 'les_1',
      activityId: 'act_1',
      activityType: 'raise_hands',
      completed: true,
      durationMs: 1200,
      attempts: 1,
      timestamp: Date.now(),
      retryCount: 0,
      synced: true,
    },
  ]);

  if (metrics.totalCompleted !== 1) return false;

  const derived = insightsEngine.deriveInsights([
    {
      completionId: 'test_1',
      lessonId: 'les_1',
      activityId: 'act_1',
      activityType: 'raise_hands',
      completed: true,
      durationMs: 1200,
      attempts: 1,
      timestamp: Date.now(),
      retryCount: 0,
      synced: true,
    },
  ]);

  if (!derived.strongestSkills || derived.strongestSkills.length === 0) return false;

  return true;
}
