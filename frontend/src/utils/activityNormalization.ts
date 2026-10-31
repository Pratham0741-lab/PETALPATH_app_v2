/**
 * Normalizes any curriculum activity type to one of the four supported core modalities
 * which have progress tracking database tables and screens: video, listen, speak, write.
 */
export const normalizeActivityType = (
  type: string | null | undefined
): 'video' | 'listen' | 'speak' | 'write' | 'drag_drop' => {
  if (!type) return 'listen';
  const t = type.toLowerCase().trim();

  // Drag & Drop interactive types
  if (
    t === 'drag_drop' ||
    t === 'drag-and-drop' ||
    t === 'drag' ||
    t === 'sorting' ||
    t === 'puzzle' ||
    t === 'sequence' ||
    t === 'categorization' ||
    t === 'matching'
  ) {
    return 'drag_drop';
  }

  // Video types
  if (t === 'video' || t === 'tutorial' || t === 'watch') {
    return 'video';
  }

  // Write types
  if (t === 'write' || t === 'spell' || t === 'trace') {
    return 'write';
  }

  // Speak types
  if (t === 'speak' || t === 'blend' || t === 'conversation' || t === 'read') {
    return 'speak';
  }

  // Listen types (and fallback for cognitive/tap/games/quizzes)
  if (
    t === 'listen' ||
    t === 'phonics' ||
    t === 'identify' ||
    t === 'revision' ||
    t === 'tap' ||
    t === 'game' ||
    t === 'quiz' ||
    t === 'assessment' ||
    t === 'story' ||
    t === 'reading'
  ) {
    return 'listen';
  }

  // Default fallback
  return 'listen';
};

/**
 * One stop per screen. Many curriculum types (tap, select, count, draw, match…)
 * have no screen of their own and open the Listen screen, so a lesson listing
 * listen + tap + select used to play Listen three times and show a stop for
 * each. Keeps the first activity for each screen in lesson order — preferring
 * the one whose own type *is* that screen (the real "listen", which has the
 * audio) over a fallback.
 */
export function oneActivityPerScreen<T extends { activityType: string }>(activities: readonly T[]): T[] {
  const chosen = new Map<string, T>();
  for (const act of activities) {
    const screen = normalizeActivityType(act.activityType);
    const current = chosen.get(screen);
    const isExact = act.activityType?.toLowerCase().trim() === screen;
    if (!current || (isExact && current.activityType?.toLowerCase().trim() !== screen)) {
      chosen.set(screen, act);
    }
  }
  const keep = new Set(chosen.values());
  return activities.filter((a) => keep.has(a));
}
