/**
 * Charts that fill their container, and say what they contain (spec §27, §30).
 *
 * Every x/y chart in this folder defaulted to `width = 300`, which is exactly
 * the hardcoded dimension the spec rules out: a parent card at 360px has about
 * 284px of usable room, so a 300px chart ran off the side of the screen. The
 * screens that noticed worked around it with `screenWidth - spacing.lg * 4` —
 * arithmetic that silently goes wrong the moment a padding token changes.
 *
 * Measuring the container instead is correct at 360, 390, 412 and 430px, inside
 * a card or outside one, with no magic numbers at the call site. An explicit
 * `width` still wins, for the caller that genuinely knows better.
 */

import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export interface ChartWidth {
  /** The width to draw with. 0 until the first layout pass lands. */
  width: number;
  onLayout: (e: LayoutChangeEvent) => void;
  /** False until there is a real width — draw nothing rather than a 0-wide SVG. */
  ready: boolean;
}

export function useChartWidth(explicit?: number): ChartWidth {
  const [measured, setMeasured] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    /* Rounded, and only on a real change: layout fires again on rotation and on
       every re-measure, and storing the same number would still re-render. */
    setMeasured((prev) => (prev === next ? prev : next));
  }, []);

  const width = typeof explicit === 'number' && explicit > 0 ? explicit : measured;

  return { width, onLayout, ready: width > 0 };
}

/**
 * Which x-axis labels to actually draw.
 *
 * Every chart here drew a label under *every* point. That is fine for a 7-bar
 * week and illegible for a 30-day month: at ~280px of plot the slots are 9px
 * wide, so "Sep 14" is drawn over "Sep 15" over "Sep 16" and the axis turns
 * into a grey smear. SVG text does not wrap, ellipsize or collide-detect, so
 * nothing prevents it — the chart has to thin the labels itself.
 *
 * Rather than rotating them (hard to read, and it steals vertical space from
 * the plot) this keeps every nth label, choosing n from the widest label and
 * the room available. The first label is always kept so the axis has an anchor,
 * and the last is added when it would not collide with the one before it.
 *
 * `slotWidth` is the horizontal room one label owns: the bar pitch for a bar
 * chart, the point spacing for a line.
 */
export function pickLabelIndices(
  labels: string[],
  slotWidth: number,
  fontSize = 10,
): Set<number> {
  const keep = new Set<number>();
  if (labels.length === 0) return keep;
  if (!Number.isFinite(slotWidth) || slotWidth <= 0) return new Set(labels.map((_, i) => i));

  // No text measurement API in react-native-svg, so estimate: for the rounded
  // sans used here an average glyph is a little over half the point size, and
  // 6px of breathing room keeps neighbours from touching.
  const widest = labels.reduce((m, l) => Math.max(m, l.length), 0) * fontSize * 0.62;
  const stride = Math.max(1, Math.ceil((widest + 6) / slotWidth));

  for (let i = 0; i < labels.length; i += stride) keep.add(i);

  const last = labels.length - 1;
  const lastKept = Math.max(...keep);
  if (last - lastKept >= stride) keep.add(last);

  return keep;
}

/**
 * A chart with no label is announced as "bar chart" and nothing else, which is
 * worth about as much to a screen reader as an unlabelled image. This reads the
 * series out instead, so a parent using VoiceOver gets the numbers (§30).
 */
export function summarizeSeries(
  kind: string,
  data: Array<{ label: string; value: number }>,
  unit?: string,
): string {
  if (data.length === 0) return `${kind}, no data yet`;
  const points = data
    .map((d) => `${d.label}: ${Math.round(d.value)}${unit ? ` ${unit}` : ''}`)
    .join(', ');
  return `${kind}. ${points}`;
}
