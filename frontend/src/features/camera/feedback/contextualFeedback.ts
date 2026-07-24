import { IntentCategory, INTENT_FEEDBACK_MESSAGES } from '../config/feedback';
import { PoseFrame, ActivityEngineResult } from '../types/pose.types';

export interface ContextualFeedbackResult {
  message: string;
  category: IntentCategory;
}

export function getContextualFeedback(
  frame: PoseFrame | null,
  activityResult: ActivityEngineResult,
): ContextualFeedbackResult {
  if (!frame || !frame.landmarks) {
    return {
      message: INTENT_FEEDBACK_MESSAGES.recovery[0],
      category: 'recovery',
    };
  }

  const { landmarks } = frame;
  const lSh = landmarks.leftShoulder;
  const rSh = landmarks.rightShoulder;
  const lWr = landmarks.leftWrist;
  const rWr = landmarks.rightWrist;

  // 1. Positioning check: if shoulders are out of frame or too small
  if (!lSh || !rSh || (lSh.visibility ?? 0) < 0.5 || (rSh.visibility ?? 0) < 0.5) {
    return {
      message: INTENT_FEEDBACK_MESSAGES.positioning[0],
      category: 'positioning',
    };
  }

  // 2. Specific Posture check for raise_hands: wrists should be above shoulders
  if (activityResult.activityType === 'raise_hands') {
    if (lWr.y > lSh.y || rWr.y > rSh.y) {
      return {
        message: INTENT_FEEDBACK_MESSAGES.posture[0],
        category: 'posture',
      };
    }
  }

  // 3. Activity completed check
  if (activityResult.state === 'completed') {
    return {
      message: INTENT_FEEDBACK_MESSAGES.completion[0],
      category: 'completion',
    };
  }

  // 4. Default encouragement
  return {
    message: INTENT_FEEDBACK_MESSAGES.encouragement[0],
    category: 'encouragement',
  };
}
