/**
 * Listening-activity answer options named after what the audio says.
 *
 * The option labels used to come from the lesson title ("Letter G") while the
 * audio says "Capital G". Each audio file's name records its content, so the
 * correct option and its three decoys are taken from the same family of names:
 *
 *   alphabet_007_g.mp3                → "Capital G"     (decoys: other capitals)
 *   english_007_letter_g_listen.mp3   → "Letter G"      (decoys: other letters)
 *   numbers_003_three.mp3             → "Three"         (decoys: other numbers)
 *   shapes_002_oval.mp3               → "Oval"          (decoys: other shapes)
 *   lines_curves_001_standing_line.mp3 → "Standing Line" (decoys: other lines)
 *
 * Returns null for audio it does not recognise; the caller then falls back to
 * the lesson-title options.
 */
import { shuffleArray } from './shuffle';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const SHAPES = ['Circle', 'Oval', 'Triangle', 'Square', 'Rectangle', 'Pentagon'];
const LINES = [
  'Standing Line', 'Sleeping Line', 'Left Slanting Line', 'Right Slanting Line',
  'Big Curve', 'Small Curve', 'Zigzag Line',
];

const titleCase = (s: string) =>
  s.split(/[_\s]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export interface ListenOptions {
  options: string[];
  correct: string;
}

function build(correct: string, pool: string[], rng: () => number, count: number): ListenOptions {
  const decoys = shuffleArray(pool.filter((p) => p !== correct), rng).slice(0, count - 1);
  return { correct, options: shuffleArray([correct, ...decoys], rng) };
}

export function listenOptionsFromAudio(
  audioKey: string | null | undefined,
  rng: () => number = Math.random,
  count = 4,
): ListenOptions | null {
  if (!audioKey) return null;
  const file = (audioKey.split('/').pop() ?? '').toLowerCase().replace(/\?.*$/, '');

  let m = file.match(/^alphabet_\d+_([a-z])\.mp3$/);
  if (m) return build(`Capital ${m[1]!.toUpperCase()}`, LETTERS.map((l) => `Capital ${l}`), rng, count);

  m = file.match(/^english_\d+_letter_([a-z])_listen\.mp3$/);
  if (m) return build(`Letter ${m[1]!.toUpperCase()}`, LETTERS.map((l) => `Letter ${l}`), rng, count);

  m = file.match(/^numbers_\d+_([a-z]+)\.mp3$/);
  if (m) {
    const word = titleCase(m[1]!);
    return build(word, NUMBERS.includes(word) ? NUMBERS : [word, ...NUMBERS], rng, count);
  }

  m = file.match(/^shapes_\d+_([a-z_]+)\.mp3$/);
  if (m) {
    const shape = titleCase(m[1]!);
    return build(shape, SHAPES.includes(shape) ? SHAPES : [shape, ...SHAPES], rng, count);
  }

  m = file.match(/^lines_curves_\d+_([a-z_]+)\.mp3$/);
  if (m) {
    const line = titleCase(m[1]!);
    return build(line, LINES.includes(line) ? LINES : [line, ...LINES], rng, count);
  }

  return null;
}
