/**
 * Which of a lesson's activities a child can actually do.
 *
 * The app builds Listen, Speak and Write content from the lesson's title
 * (frontend/src/utils/lessonActivityMatcher.ts): a letter, number, shape,
 * word family, word or sound. When the title names none of these ("Free
 * Play", "All About Me") those screens fell back to the title itself — "which
 * one is Free Play?", "say Free Play" — and drag and drop fell back to a
 * random-letter board unrelated to the lesson. Those are not tasks a child
 * can perform, so they are not offered.
 *
 *   Video        always
 *   Listen/Write the title names a concrete target
 *   Speak        a concrete target, or a short word a child can say (Head, Dog, Hello & Bye)
 *   Drag & drop  a hand-made board, or a letter board for a lesson about that letter
 *
 * Used by the lesson's activity list, the roadmap (so its "activities left"
 * matches the lesson) and the completion check (so a lesson is never waiting
 * on an activity that is not offered).
 */
import fs from 'fs';
import path from 'path';
import { normalizeActivityType } from './activity-type-normalizer.js';
import { BLUEPRINTS } from './drag-drop/blueprints.js';
import { revisionTraceItems } from './revision-trace-sets.js';

export interface PlannableNode {
  id: string;
  title: string;
}

const SHAPES = [
  'standing line', 'sleeping line', 'left slanting line', 'right slanting line', 'slanting line',
  'big curve', 'small curve', 'semi circle', 'zig-zag', 'zigzag', 'spiral', 'loop', 'combined curves',
  'left curve', 'right curve', 'wave pattern', 'triangle', 'square', 'rectangle', 'oval', 'star',
  'heart', 'diamond', 'pentagon', 'hexagon', 'circle',
];

/**
 * True when the title names something the matcher turns into a real task.
 * Mirrors the concrete branches of the app's getLessonMatchData (1-10).
 */
export function hasConcreteTarget(title: string): boolean {
  const c = title.toLowerCase();
  return (
    SHAPES.some((s) => c.includes(s)) ||
    /letter\s+[a-z]\b/.test(c) ||
    /sound\s+(of\s+)?[a-z]\b/.test(c) ||
    /-[a-z]+\s+family/.test(c) ||
    /word:\s*[a-z]+/.test(c) ||
    /number\s+\d+/.test(c) ||
    /short [aeiou]\b/.test(c) ||
    c.includes('capital a-z') ||
    c.includes('lowercase a-z') ||
    c.includes('lines') ||
    c.includes('curves') ||
    c.includes('trace line') ||
    c.includes('straight') ||
    c.includes('slanting') ||
    (c.includes('count') && c.includes('write'))
  );
}

/** Words that make a title an activity description rather than a word to say. */
const NOT_A_WORD = new Set([
  'play', 'tap', 'time', 'review', 'revision', 'practice', 'game', 'games', 'activity', 'activities',
  'story', 'stories', 'song', 'songs', 'rhyme', 'rhymes', 'introduction', 'intro', 'settling', 'comfort',
  'about', 'all', 'recap', 'test', 'assessment', 'exploration', 'explore', 'puzzle', 'puzzles', 'maze',
  'mazes', 'trace', 'tracing', 'draw', 'drawing', 'colour', 'colouring', 'color', 'coloring', 'sort',
  'sorting', 'match', 'matching', 'count', 'counting', 'week', 'celebration', 'free', 'bubbles', 'fun',
  'show', 'tell', 'mixed', 'cumulative', 'consolidation', 'readiness', 'check', 'the', 'my', 'me',
  'our', 'of', 'to', 'in', 'with', 'a', 'an', 'spot',
]);

/** A short word or pair of words a child can say: "Head", "Dog", "Hello & Bye", "Maa (Mother)". */
export function isSpeakableWord(title: string): boolean {
  const words = title
    .replace(/\(.*?\)/g, ' ')
    .replace(/[&/,:\-–—!?.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return (
    words.length >= 1 &&
    words.length <= 3 &&
    words.every((w) => /^[A-Za-z]+$/.test(w)) &&
    words.join('').length <= 20 &&
    !words.some((w) => NOT_A_WORD.has(w.toLowerCase()))
  );
}

let manifestIds: Set<string> | null = null;
/** Lessons with a hand-made board file (curriculum/activities/drag_drop_manifest.json). */
function handMadeBoardIds(): Set<string> {
  if (manifestIds) return manifestIds;
  manifestIds = new Set();
  for (const p of [
    path.resolve(process.cwd(), 'curriculum', 'activities', 'drag_drop_manifest.json'),
    path.resolve(process.cwd(), '..', 'curriculum', 'activities', 'drag_drop_manifest.json'),
  ]) {
    if (!fs.existsSync(p)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const a of manifest.activities ?? []) manifestIds.add(a.nodeId);
    } catch {
      /* unreadable manifest: no hand-made boards */
    }
    break;
  }
  return manifestIds;
}

/** A drag-and-drop board that is about this lesson (not the random-letter fallback). */
export function hasMeaningfulDragDrop(node: PlannableNode): boolean {
  return (
    handMadeBoardIds().has(node.id) ||
    Object.prototype.hasOwnProperty.call(BLUEPRINTS, node.id) ||
    /letter\s+[a-z]\b/i.test(node.title) ||
    /letter_[a-z]$/i.test(node.id)
  );
}

/** Can a child do this activity in this lesson? */
export function isPerformableActivity(activityType: string, node: PlannableNode): boolean {
  switch (normalizeActivityType(activityType)) {
    case 'video':
      return true;
    case 'drag_drop':
      return hasMeaningfulDragDrop(node);
    case 'speak':
      return hasConcreteTarget(node.title) || isSpeakableWord(node.title);
    case 'write':
      // A revision lesson traces its whole topic (revision-trace-sets.ts).
      return revisionTraceItems(node.id) !== null || hasConcreteTarget(node.title);
    default:
      // listen, write, and every type that falls back to the Listen screen
      return hasConcreteTarget(node.title);
  }
}
