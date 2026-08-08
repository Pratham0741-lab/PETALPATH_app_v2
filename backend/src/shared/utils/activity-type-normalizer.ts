/**
 * Normalizes granular curriculum activity types to the four core modalities
 * tracked by the progress system: video, listen, speak, write.
 *
 * This must stay in sync with frontend/src/utils/activityNormalization.ts.
 */
export function normalizeActivityType(
  type: string | null | undefined
): 'video' | 'listen' | 'speak' | 'write' | 'drag_drop' {
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

  // Write types (trace, draw → write)
  if (t === 'write' || t === 'spell' || t === 'trace' || t === 'draw') {
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
    t === 'reading' ||
    t === 'count' ||
    t === 'match' ||
    t === 'sort' ||
    t === 'select' ||
    t === 'circle' ||
    t === 'connect' ||
    t === 'classify' ||
    t === 'compare' ||
    t === 'pattern' ||
    t === 'measure' ||
    t === 'missing_number' ||
    t === 'memory' ||
    t === 'addition' ||
    t === 'subtraction' ||
    t === 'arrange' ||
    t === 'assessment'
  ) {
    return 'listen';
  }

  // Default fallback
  return 'listen';
}
