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
