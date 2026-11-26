/**
 * What a Speak screen records when the child moves on. Pure, so it can be
 * unit-tested; SpeakContent calls it instead of choosing scores inline.
 *
 *   coming-soon  nothing (like Listen and Video coming-soon): nothing was said
 *   scored skip  0, no stars: recognition was unavailable or the network failed
 */
export type SpeakMode = 'scored' | 'coming-soon';

export type ProceedReason = 'next' | 'skip';

/** The score to save, or null to record nothing. */
export function scoreOnProceed(mode: SpeakMode, reason: ProceedReason): number | null {
  if (mode === 'coming-soon') return null;
  return reason === 'skip' ? 0 : null;
}
