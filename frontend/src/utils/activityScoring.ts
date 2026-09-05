/**
 * One place that turns a raw attempt into the accuracy and stars a child sees,
 * so the two can never disagree — the star count is always derived from the same
 * number that is shown as the accuracy.
 *
 * Two ideas:
 *
 *  1. **Real accuracy.** Speech and tracing both measure how close the attempt
 *     actually was (string similarity for speech, geometric overlap for tracing).
 *     Nothing is faked — the previous speech path defaulted to a flat 90% whenever
 *     the recognizer reported no confidence, which is what made the number wrong.
 *
 *  2. **Honesty level.** A raw score is brutally honest and can crush a two-to-
 *     six-year-old ("you were 12% right"). `HONESTY_LEVEL` blends the true score
 *     toward a generous 100 so the child sees an encouraging-but-still-earned
 *     number. At 0.5 the displayed accuracy is halfway between the raw score and
 *     100: a raw 0 reads 50, a raw 100 still reads 100, and doing better always
 *     moves the number up. Set to 1 for fully honest, 0 for "everyone gets 100".
 *
 * Correctness gates (the "that's not quite right, try again" thresholds) stay on
 * the RAW score in the callers, so leniency never lets a scribble or a wrong word
 * pass — it only softens the number and stars shown once an attempt is accepted.
 */

/** How truthful the shown accuracy is. 0.5 = half real score, half encouragement. */
export const HONESTY_LEVEL = 0.5;

/** Clamp to 0-100. */
function clampPercent(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/**
 * Blend a raw 0-100 accuracy toward a generous 100 by the honesty level.
 * honesty 1 → raw, honesty 0 → 100, honesty 0.5 → halfway.
 */
export function applyHonesty(rawPercent: number, honesty: number = HONESTY_LEVEL): number {
  const raw = clampPercent(rawPercent);
  const h = Math.max(0, Math.min(1, honesty));
  return Math.round(100 - (100 - raw) * h);
}

/** Stars from a shown accuracy — the single mapping used everywhere. */
export function starsForAccuracy(accuracyPercent: number): number {
  const a = clampPercent(accuracyPercent);
  if (a >= 80) return 3;
  if (a >= 60) return 2;
  if (a >= 40) return 1;
  return 0;
}

/**
 * Turn a raw 0-100 accuracy into the `{ accuracy, stars }` shown to the child.
 * Callers should use both fields from here rather than deriving stars themselves,
 * so the meter and the star row always agree.
 */
export function scoreActivity(
  rawPercent: number,
  honesty: number = HONESTY_LEVEL,
): { accuracy: number; stars: number } {
  const accuracy = applyHonesty(rawPercent, honesty);
  return { accuracy, stars: starsForAccuracy(accuracy) };
}

/** Levenshtein edit distance between two strings. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * How close two phrases are, 0-1, by normalized edit distance. Used to score
 * speech against the target phrase so the accuracy reflects what was actually
 * said rather than a fixed default.
 */
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const distance = editDistance(a, b);
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : Math.max(0, 1 - distance / longest);
}
