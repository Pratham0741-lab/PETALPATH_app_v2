/**
 * Calendar-day arithmetic for review scheduling.
 *
 * `now + N * 86_400_000` is *24 hours*, not "the next day": a lesson finished at
 * 23:50 would come due at 23:50 tomorrow rather than at breakfast the next
 * morning. Reviews are meant to be a daily ritual for the child, so they are
 * scheduled to the **start of a local calendar day** instead.
 *
 * There is no per-child timezone column in the schema, so the offset comes from
 * `engineConfig.unified.review.timezoneOffsetMinutes` (IST by default). When a
 * timezone field is added to `Child`, pass it here instead — every function is
 * pure and takes the offset explicitly, so nothing else has to change.
 *
 * Everything in this file is pure so the DB-free tsc harness can execute it.
 */

export const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 86_400_000;

/**
 * The number of whole local days since the epoch. Two instants share a local
 * calendar day exactly when this value matches.
 */
export function localDayIndex(date: Date, offsetMinutes: number): number {
  return Math.floor((date.getTime() + offsetMinutes * MS_PER_MINUTE) / MS_PER_DAY);
}

/**
 * Midnight at the start of the local day containing `date`, as a UTC instant.
 */
export function startOfLocalDay(date: Date, offsetMinutes: number): Date {
  const localMidnight = localDayIndex(date, offsetMinutes) * MS_PER_DAY;
  return new Date(localMidnight - offsetMinutes * MS_PER_MINUTE);
}

/**
 * Start of the local day `days` calendar days after `date`.
 *
 * `addCalendarDays(23:50 today, 1)` is tomorrow at 00:00 local, not tomorrow at
 * 23:50 — which is the whole point of preferring this over millisecond maths.
 */
export function addCalendarDays(date: Date, days: number, offsetMinutes: number): Date {
  return new Date(startOfLocalDay(date, offsetMinutes).getTime() + days * MS_PER_DAY);
}

/**
 * Whole local calendar days from `from` to `to`. Negative when `to` precedes
 * `from`. Used for retention decay, where "how many sleeps ago" matters more
 * than the exact elapsed hours.
 */
export function calendarDaysBetween(from: Date, to: Date, offsetMinutes: number): number {
  return localDayIndex(to, offsetMinutes) - localDayIndex(from, offsetMinutes);
}

export function isSameLocalDay(a: Date, b: Date, offsetMinutes: number): boolean {
  return localDayIndex(a, offsetMinutes) === localDayIndex(b, offsetMinutes);
}

/**
 * True when a scheduled review has come due. Comparing day indices rather than
 * timestamps means a review scheduled for "tomorrow" is available from the
 * moment the child wakes up, not from the hour they happened to finish.
 */
export function isDue(nextReviewDate: Date, now: Date, offsetMinutes: number): boolean {
  return localDayIndex(nextReviewDate, offsetMinutes) <= localDayIndex(now, offsetMinutes);
}

/**
 * Fractional elapsed days, for continuous decay curves that would look stepped
 * if they only ever saw whole days.
 */
export function elapsedDays(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_DAY);
}
