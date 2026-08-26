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
