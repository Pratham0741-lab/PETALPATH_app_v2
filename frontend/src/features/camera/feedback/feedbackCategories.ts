export type FeedbackCategory =
  | 'success'
  | 'encouragement'
  | 'retry'
  | 'completion'
  | 'countdown';

export const FEEDBACK_MESSAGES: Record<FeedbackCategory, string[]> = {
  success: ['Awesome job!', 'Superstar pose!', 'You got it!', 'Perfect posture!'],
  encouragement: ['Keep holding steady!', 'Almost there!', 'Hold it right there!', 'You are doing great!'],
  retry: ['Step back into frame', 'Make sure your hands are visible', 'Position yourself in front of camera', 'Try again!'],
  completion: ['Activity Completed!', '3 Stars Earned! 🎉', 'Superstar achievement unlocked!'],
  countdown: ['Get ready to move!', '3...', '2...', '1...', 'Go!'],
};

export function getRandomFeedback(category: FeedbackCategory): string {
  const list = FEEDBACK_MESSAGES[category] || FEEDBACK_MESSAGES.encouragement;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
