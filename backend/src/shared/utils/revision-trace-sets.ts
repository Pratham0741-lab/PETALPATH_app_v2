/**
 * What a revision lesson's tracing activity traces: every item of the topic,
 * one after another (A-Z, a-z, 1-50, अ-अः, the matra words…).
 *
 * The lists live in curriculum/revision/trace-sets.json, keyed by lesson id,
 * and travel to the app on the write activity as `traceItems`. The app has a
 * tracing guide for each item (frontend/src/utils/traceGuides.ts). A lesson
 * with a list always offers its tracing activity, whatever its title says.
 */
import fs from 'fs';
import path from 'path';

let sets: Record<string, string[]> | null = null;

function load(): Record<string, string[]> {
  if (sets) return sets;
  sets = {};
  for (const p of [
    path.resolve(process.cwd(), 'curriculum', 'revision', 'trace-sets.json'),
    path.resolve(process.cwd(), '..', 'curriculum', 'revision', 'trace-sets.json'),
  ]) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
      for (const [id, items] of Object.entries(raw)) {
        if (id.startsWith('_') || !Array.isArray(items)) continue;
        sets[id] = items.filter((i): i is string => typeof i === 'string' && i.length > 0);
      }
    } catch {
      /* unreadable file: no revision sequences */
    }
    break;
  }
  return sets;
}

/** The items a revision lesson traces, in order, or null when it has no list. */
export function revisionTraceItems(lessonId: string): string[] | null {
  const items = load()[lessonId];
  return items && items.length > 0 ? items : null;
}
