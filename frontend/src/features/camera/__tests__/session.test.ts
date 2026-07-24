import { ActivitySessionEngine } from '../session/ActivitySessionEngine';
import { getActivityDefinition } from '../session/activityDefinitions';
import { ActivityEngineResult } from '../types/pose.types';

export function runSessionEngineVerification(): boolean {
  const engine = new ActivitySessionEngine();
  const def = getActivityDefinition('raise_hands');

  // 1. Initial State
  if (engine.getSnapshot().state !== 'idle') return false;

  // 2. Start Session
  engine.startSession(def, 3);
  if (engine.getSnapshot().state !== 'starting') return false;

  // 3. Countdown tick
  engine.tickCountdown(); // 2
  engine.tickCountdown(); // 1
  engine.tickCountdown(); // 0 -> running
  if (engine.getSnapshot().state !== 'running') return false;

  // 4. Evaluate frames while pose is detected
  const detectedFrameResult: ActivityEngineResult = {
    activityType: 'raise_hands',
    state: 'detected',
    confidence: 0.9,
    feedback: 'Keep holding!',
  };

  // Evaluate frame simulating 1600ms hold (exceeds 1500ms target)
  const now = Date.now();
  engine.evaluateFrame(detectedFrameResult, now);
  engine.evaluateFrame(detectedFrameResult, now + 1600);

  const snapshot = engine.getSnapshot();
  if (snapshot.state !== 'completed') return false;

  // 5. Reset Session
  engine.resetSession();
  if (engine.getSnapshot().state !== 'idle') return false;

  return true;
}
