/**
 * Intent-level coaching lines for the pose engine.
 *
 * The completion line lost its trailing 🎉 for the same two reasons as
 * `feedback/feedbackCategories.ts`: `ChildFeedbackOverlay` now draws a real
 * trophy glyph beside it, so the emoji was a second, worse icon (§7), and these
 * strings reach text-to-speech, which reads 🎉 aloud as "party popper".
 */
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
    'Activity Completed! Fantastic job!',
    'Superstar performance!',
  ],
  recovery: [
    'Step back into the camera frame',
    'Make sure your upper body is visible',
  ],
};
