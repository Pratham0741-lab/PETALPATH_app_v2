/**
 * How many stars a lesson can award: 3 for every activity the child can do in
 * it.
 *
 * The app shows one screen per activity kind (watch, listen, speak, trace,
 * match — see the app's `oneActivityPerScreen`), and each screen scores 0-3
 * stars, stored per kind on `LessonProgress`. So the maximum is 3 x the number
 * of distinct kinds the lesson offers. A watch or listen activity whose media
 * is "coming soon" cannot be done and awards nothing, so it does not count.
 *
 * The lesson used to be scored out of a fixed 8 whatever it contained: a
 * video-only lesson could never look complete and a five-activity lesson
 * could show "12 / 8".
 */
import { normalizeActivityType } from './activity-type-normalizer.js';
import { COMING_SOON, servedMediaKey } from './media-paths.js';

export const STARS_PER_ACTIVITY = 3;

export type StarScreen = 'video' | 'listen' | 'speak' | 'write' | 'drag_drop';

export interface StarCountableActivity {
  activityType: string;
  video?: { videoKey?: string | null } | null;
  audio?: { audioKey?: string | null } | null;
}

const playable = (key: string | null | undefined): boolean => {
  const served = servedMediaKey(key);
  return !!served && !served.toLowerCase().includes(COMING_SOON);
};

/** The activity kinds in a lesson that can award stars. */
export function starScreensOf(activities: readonly StarCountableActivity[]): Set<StarScreen> {
  const screens = new Set<StarScreen>();
  for (const a of activities) {
    const screen = normalizeActivityType(a.activityType);
    if (screen === 'video' && !playable(a.video?.videoKey)) continue;
    if (screen === 'listen' && !playable(a.audio?.audioKey)) continue;
    screens.add(screen);
  }
  return screens;
}

/** 3 x the activity kinds the lesson offers (0 for a lesson with nothing doable). */
export function maxStarsOf(activities: readonly StarCountableActivity[]): number {
  return starScreensOf(activities).size * STARS_PER_ACTIVITY;
}

/** Stars earned on a progress row: the best score of each activity kind. */
export function earnedStarsOf(p: {
  videoStars: number;
  listenStars: number;
  speakStars: number;
  writeStars: number;
  dragDropStars?: number | null;
}): number {
  return p.videoStars + p.listenStars + p.speakStars + p.writeStars + (p.dragDropStars ?? 0);
}
