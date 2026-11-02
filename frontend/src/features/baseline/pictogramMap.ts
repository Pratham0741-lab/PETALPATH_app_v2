/**
 * Which built-in picture a bank image path draws. Pure (no React Native), so
 * the unit tests can check every picture in the item bank resolves.
 *
 * Matched by file name:
 * - `apple.png`, `car.png`, … an object icon in its real colour (OBJECTS)
 * - `big_ball.png` / `small_ball.png` the same icon, large or small
 * - `red_circle.png`, `blue_square.png`, `dot_green.png` coloured shapes
 * - `num_4.png`, `letter_B.png`, `word_cat.png` a numeral, letter or word
 * - `basket_6_balls.png` a basket with that many balls
 * - `shrug.png` the "I don't know" mark
 */
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** True colours: these items test colour, so no brand tints. */
export const COLOURS: Record<string, string> = {
  red: '#E5484D',
  blue: '#3B82F6',
  green: '#22A06B',
  yellow: '#F5C518',
  orange: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  black: '#2B2B2B',
  brown: '#8B5A2B',
};

/** File name → Material Design icon and the colour the real thing has. */
export const OBJECTS: Record<string, { icon: IconName; colour: string }> = {
  apple: { icon: 'food-apple', colour: COLOURS.red },
  grapes: { icon: 'fruit-grapes', colour: COLOURS.purple },
  pear: { icon: 'fruit-pear', colour: '#9BBF3B' },
  cherries: { icon: 'fruit-cherries', colour: '#C81E3A' },
  pineapple: { icon: 'fruit-pineapple', colour: '#E0A10B' },
  watermelon: { icon: 'fruit-watermelon', colour: COLOURS.green },
  ball: { icon: 'soccer', colour: COLOURS.black },
  cat: { icon: 'cat', colour: COLOURS.orange },
  dog: { icon: 'dog', colour: COLOURS.brown },
  cow: { icon: 'cow', colour: COLOURS.black },
  duck: { icon: 'duck', colour: '#E0A10B' },
  bird: { icon: 'bird', colour: COLOURS.blue },
  rabbit: { icon: 'rabbit', colour: '#9C8577' },
  elephant: { icon: 'elephant', colour: '#7D8597' },
  horse: { icon: 'horse', colour: COLOURS.brown },
  pig: { icon: 'pig', colour: COLOURS.pink },
  bat: { icon: 'bat', colour: '#4B3B6B' },
  fish: { icon: 'fish', colour: '#2B9FD8' },
  sun: { icon: 'weather-sunny', colour: '#F5A30B' },
  moon: { icon: 'moon-waning-crescent', colour: '#E0A10B' },
  star: { icon: 'star', colour: COLOURS.yellow },
  car: { icon: 'car', colour: COLOURS.red },
  bus: { icon: 'bus', colour: '#E0A10B' },
  train: { icon: 'train', colour: COLOURS.blue },
  bicycle: { icon: 'bicycle', colour: COLOURS.green },
  aeroplane: { icon: 'airplane', colour: COLOURS.blue },
  boat: { icon: 'sail-boat', colour: COLOURS.blue },
  flower: { icon: 'flower', colour: COLOURS.pink },
  tree: { icon: 'tree', colour: COLOURS.green },
  house: { icon: 'home', colour: COLOURS.brown },
  umbrella: { icon: 'umbrella', colour: COLOURS.purple },
  cup: { icon: 'cup', colour: COLOURS.blue },
  balloon: { icon: 'balloon', colour: COLOURS.red },
  kite: { icon: 'kite', colour: COLOURS.orange },
  /* Sums: "two apples plus one apple". */
  plus: { icon: 'plus', colour: COLOURS.black },
};

const SHAPE_ICONS: Record<string, IconName> = { circle: 'circle', square: 'square', triangle: 'triangle' };

/** Fraction of the tile a small picture fills (a normal or big one fills it). */
export const SMALL_SCALE = 0.45;

export type Pic =
  | { kind: 'icon'; icon: IconName; colour: string; scale: number }
  | { kind: 'glyph'; text: string }
  | { kind: 'basket'; count: number }
  | { kind: 'idk' };

export function pictogramFor(path: string | null | undefined): Pic | null {
  if (!path) return null;
  const base = (path.split('/').pop() ?? '').replace(/\.[a-z0-9]+$/i, '');
  const key = base.toLowerCase();
  if (key === 'shrug') return { kind: 'idk' };

  const sized = /^(big|small)_(.+)$/.exec(key);
  const scale = sized?.[1] === 'small' ? SMALL_SCALE : 1;
  const object = OBJECTS[sized ? sized[2] : key];
  if (object) return { kind: 'icon', ...object, scale };

  let m = /^num_(\d+)$/.exec(key);
  if (m) return { kind: 'glyph', text: m[1] };
  m = /^(?:letter|word)_(.+)$/i.exec(base);
  if (m) return { kind: 'glyph', text: m[1] };
  m = /^basket_(\d+)_balls?$/.exec(key);
  if (m) return { kind: 'basket', count: Number(m[1]) };
  m = /^dot_([a-z]+)$/.exec(key);
  if (m && COLOURS[m[1]]) return { kind: 'icon', icon: 'circle', colour: COLOURS[m[1]], scale: 1 };
  m = /^([a-z]+)_(circle|square|triangle)$/.exec(key);
  if (m && COLOURS[m[1]]) return { kind: 'icon', icon: SHAPE_ICONS[m[2]], colour: COLOURS[m[1]], scale: 1 };
  return null;
}
