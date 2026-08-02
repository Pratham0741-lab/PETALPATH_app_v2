/**
 * Synchronizer for drag_drop activities.
 *
 * Rules:
 * 1. ONLY fills fields that are spec-required AND currently missing.
 * 2. Builds the localization.stringKeys manifest (optional but explicitly
 *    valuable as a translation verification manifest per the spec).
 * 3. Adds localization.textDirection when absent (simple to derive from
 *    primaryLanguage).
 * 4. Never injects optional defaults — the engine applies those at runtime.
 * 5. Never changes business logic, template assignments, or educational intent.
 */

import type { ActivitySynchronizer, SyncChange, SyncResult } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addChange(
  changes: SyncChange[],
  field: string,
  action: SyncChange['action'],
  before: unknown,
  after: unknown,
): void {
  changes.push({ field, action, before, after });
}

/**
 * Collects all l10n keys actually used within the activity JSON.
 * Walks the object recursively looking for string values that start with "l10n:".
 */
function collectL10nKeys(
  obj: unknown,
  parentPath: string,
  result: Record<string, string>,
): void {
  if (obj == null) return;

  if (typeof obj === 'string' && obj.startsWith('l10n:')) {
    // Use the last segment of the key as the semantic label
    const segments = obj.split(':');
    const label = segments[segments.length - 1];
    result[label] = obj;
    return;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      collectL10nKeys(obj[i], `${parentPath}[${i}]`, result);
    }
    return;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      collectL10nKeys(value, parentPath ? `${parentPath}.${key}` : key, result);
    }
  }
}

/**
 * Derives textDirection from primaryLanguage.
 * RTL languages: Arabic (ar), Hebrew (he), Urdu (ur), Persian (fa).
 * Everything else defaults to "ltr".
 */
function deriveTextDirection(primaryLanguage: string): 'ltr' | 'rtl' {
  const rtlPrefixes = ['ar', 'he', 'ur', 'fa'];
  const langPrefix = primaryLanguage.split('-')[0].toLowerCase();
  return rtlPrefixes.includes(langPrefix) ? 'rtl' : 'ltr';
}

// ---------------------------------------------------------------------------
// Exported synchronizer
// ---------------------------------------------------------------------------

export class DragDropSynchronizer implements ActivitySynchronizer {
  synchronize(
    activity: Record<string, unknown>,
    _context: { fileName: string },
  ): SyncResult {
    // Work on a deep copy so the original is not mutated until we decide to write
    const result: Record<string, unknown> = JSON.parse(JSON.stringify(activity));
    const changes: SyncChange[] = [];

    // ------------------------------------------------------------------
    // 1. localization.stringKeys — build manifest from actual l10n usage
    // ------------------------------------------------------------------
    const l10n = result.localization as Record<string, unknown> | undefined;
    if (l10n && typeof l10n === 'object') {
      const existingKeys = l10n.stringKeys as Record<string, string> | undefined;
      const collected: Record<string, string> = {};
      collectL10nKeys(result, '', collected);

      // Only update if the manifest is missing or differs
      if (!existingKeys || JSON.stringify(existingKeys) !== JSON.stringify(collected)) {
        const before = existingKeys ?? undefined;
        l10n.stringKeys = collected;
        addChange(changes, 'localization.stringKeys', before ? 'modified' : 'added', before, collected);
      }

      // ------------------------------------------------------------------
      // 2. localization.textDirection — derive from primaryLanguage
      // ------------------------------------------------------------------
      if (l10n.textDirection == null) {
        const meta = result.metadata as Record<string, unknown> | undefined;
        const lang = (meta?.primaryLanguage as string) || 'en-IN';
        const direction = deriveTextDirection(lang);
        l10n.textDirection = direction;
        addChange(changes, 'localization.textDirection', 'added', undefined, direction);
      }
    }

    return {
      modified: changes.length > 0,
      changes,
      activity: result,
    };
  }
}
