/**
 * Unscored practice activities: today, a Hindi speaking activity while the
 * server's SPEAK_HINDI_SCORING_ENABLED is off. The server marks them on each
 * planned activity (`scored: false`); a server that predates the flag sends
 * nothing, which means scored, as before.
 *
 * Practice records nothing, so it never holds up the activity after it, never
 * counts as "left to do", and is not part of a lesson's completed count.
 */
const COMING_SOON = 'coming_soon';

export interface MaybeScored {
  readonly scored?: boolean;
}

export const isUnscoredPractice = (activity: MaybeScored | null | undefined): boolean =>
  activity?.scored === false;

/** The activities that count toward a lesson's progress and gating. */
export const scoredActivities = <T extends MaybeScored>(activities: readonly T[]): T[] =>
  activities.filter((a) => !isUnscoredPractice(a));

interface WithAudio {
  readonly activityType: string;
  readonly audio?: { readonly audioUrl?: string | null; readonly filename?: string | null } | null;
}

const playable = (url: string | null | undefined, filename?: string | null): url is string =>
  !!url && !url.includes(COMING_SOON) && filename !== COMING_SOON;

/**
 * Audio for a practice word: the speaking activity's own audio if it has
 * playable audio, else the lesson's Listen audio (the same word). Null when
 * neither is playable.
 */
export function practiceAudioUrl(speakActivity: WithAudio | null | undefined, lessonActivities: readonly WithAudio[]): string | null {
  const own = speakActivity?.audio;
  if (own && playable(own.audioUrl, own.filename)) return own.audioUrl;
  const listen = lessonActivities.find(
    (a) => a.activityType === 'listen' && a.audio && playable(a.audio.audioUrl, a.audio.filename),
  );
  return listen?.audio?.audioUrl ?? null;
}
