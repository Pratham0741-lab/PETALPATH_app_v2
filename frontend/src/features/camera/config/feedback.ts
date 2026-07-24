export type IntentCategory =
  | 'positioning'
  | 'posture'
  | 'encouragement'
  | 'completion'
  | 'recovery';

export const INTENT_FEEDBACK_MESSAGES: Record<IntentCategory, string[]> = {
  positioning: [
    'Step back slightly so your hands are visible',
    'Move a little closer to the camera',
    'Center yourself in the camera view',
  ],
  posture: [
    'Raise your hands a little higher!',
    'Stand up nice and straight',
    'Hold your hands steady',
  ],
  encouragement: [
    'Great posture, hold it right there!',
    'You are doing awesome!',
    'Keep going, almost there!',
  ],
  completion: [
    'Activity Completed! Fantastic job! 🎉',
    'Superstar performance!',
  ],
  recovery: [
    'Step back into the camera frame',
    'Make sure your upper body is visible',
  ],
};
