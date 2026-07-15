/**
 * Shared category details utility.
 *
 * Provides a consistent mapping from category title keywords to
 * display color and Ionicons icon name. Used by multiple home screen
 * components — import this instead of duplicating the mapping.
 */

export interface CategoryDetails {
  color: string;
  icon: string;
}

/**
 * Derive display color + icon from a category title string.
 *
 * Keywords (case-insensitive):
 *   prewriting → pink pencil
 *   shape      → blue shapes
 *   alpha/letter → green text
 *   num        → orange keypad
 *   word       → purple book
 *   default    → cyan reader (Reading Readiness)
 */
export function getCategoryDetails(title: string): CategoryDetails {
  const lower = title.toLowerCase();
  if (lower.includes('prewriting')) {
    return { color: '#EC4899', icon: 'pencil' };
  } else if (lower.includes('shape')) {
    return { color: '#3B82F6', icon: 'shapes' };
  } else if (lower.includes('alpha') || lower.includes('letter')) {
    return { color: '#10B981', icon: 'text' };
  } else if (lower.includes('num')) {
    return { color: '#F97316', icon: 'keypad' };
  } else if (lower.includes('word')) {
    return { color: '#8A5CF6', icon: 'book' };
  }
  return { color: '#06B6D4', icon: 'reader' };
}
