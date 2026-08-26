import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LayoutChangeEvent, StyleSheet, View, Text, Platform, PanResponder } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Point } from '../../store/writeStore';
import { PrimaryButton, SecondaryButton } from '../design/Buttons';

/**
 * Trace & Draw's canvas (spec §20: this stays a real tracing interaction, never
 * a static image). The drawing internals — PanResponder, stroke capture, the
 * native-SVG / web-<canvas> split and the guide geometry — are untouched by the
 * redesign. What changed is the surface: the toolbar's three hand-rolled
 * Pressables are now real design-system buttons with icons from the shared set
 * (§7, §28), the child's ink is TRACE green (§15) instead of brand pink, and
 * the dashed guide uses the `traceGuide` token instead of a cool grey that
 * clashed with the warm palette.
 *
 * ## One frozen drawing space
 *
 * The child's ink and the dashed guide live in a single coordinate space, `base`,
 * frozen at the first real measurement of the frame. Everything downstream —
 * `getGuideDetails`, the stored `Point`s, the `w`/`h` handed to `onComplete` for
 * scoring — is in those units, so ink and guide cannot drift apart. If the frame
 * later changes size the space is *fitted* into it, uniformly and centred, by the
 * SVG `viewBox`; nothing is re-derived.
 *
 * This replaced storing a normalised `normX`/`normY` beside every point and
 * re-projecting at render as `normX * width, normY * height`. That looks
 * equivalent and is not, for two reasons. It is a per-axis scale, so the drawing
 * squashed rather than shrank whenever the height changed on its own — which is
 * exactly what pressing Check used to do, by making room for the result banner
 * and the Continue footer. And the guide does not follow the same transform:
 * `Circle`, `Star`, `Spiral`, `Letter S`, the pentagon, the hexagon and half the
 * digits size their radius off `Math.min(w, h)` or off `h` and then use it on the
 * x axis, so a height-only change moved the guide horizontally while the ink
 * stayed put. Replayed on a 326×434 board losing 200pt: ink displaced by up to
 * 170pt, and up to 31pt of it left the dashed line altogether.
 */

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

// We import react-native-svg dynamically or capture require to prevent web bundling crashes
let Svg: any = null;
let Path: any = null;
if (Platform.OS !== 'web') {
  try {
    const SvgLib = require('react-native-svg');
    Svg = SvgLib.default || SvgLib.Svg;
    Path = SvgLib.Path;
  } catch (e) {
    if (IS_DEV) console.warn('react-native-svg not available on native:', e);
  }
}

import { getGuidePoints } from '../../utils/tracingAccuracy';

interface TracingCanvasProps {
  guideName: string;
  strokes: Point[][];
  onAddStroke: (stroke: Point[]) => void;
  onUndo: () => void;
  onClear: () => void;
  onComplete: (w: number, h: number) => void;
  isCompleted: boolean;
  onGuideLayout?: (startX: number, startY: number, endX: number, endY: number) => void;
}

export const TracingCanvas: React.FC<TracingCanvasProps> = ({
  guideName,
  strokes,
  onAddStroke,
  onUndo,
  onClear,
  onComplete,
  isCompleted,
  onGuideLayout,
}) => {
  /** Live size of the frame. Only ever used to fit the drawing space into it. */
  const [box, setBox] = useState({ w: 0, h: 0 });
  /**
   * The drawing space, frozen at the first measurement that has real numbers in
   * it. Reset only when the guide changes, i.e. on a new activity — by then the
   * store has cleared the strokes, so nothing survives into a different space.
   */
  const [base, setBase] = useState<{ w: number; h: number } | null>(null);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Mutable ref to track the current stroke for PanResponder (avoids stale closure)
  const currentStrokeRef = useRef<Point[]>([]);
  // Keep a stable ref to the onAddStroke callback
  const onAddStrokeRef = useRef(onAddStroke);
  onAddStrokeRef.current = onAddStroke;

  // Web canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Native container and layout offset measurements refs
  const containerRef = useRef<View>(null);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * How the frozen space currently sits inside the frame: the same uniform,
   * centred fit that `preserveAspectRatio="xMidYMid meet"` applies to the SVG, so
   * a touch can be converted back into drawing coordinates. Held in a ref because
   * the PanResponder is built once and would otherwise close over the first
   * render's values forever.
   */
  const fitRef = useRef({ scale: 1, dx: 0, dy: 0 });
  const fitScale =
    base && box.w > 0 && box.h > 0 ? Math.min(box.w / base.w, box.h / base.h) : 1;
  fitRef.current = {
    scale: fitScale,
    dx: base ? (box.w - base.w * fitScale) / 2 : 0,
    dy: base ? (box.h - base.h * fitScale) / 2 : 0,
  };

  /** Frame-local pixels → the frozen drawing space. */
  const toBase = (localX: number, localY: number): Point => {
    const { scale, dx, dy } = fitRef.current;
    return { x: (localX - dx) / scale, y: (localY - dy) / scale };
  };

  useEffect(() => {
    /*
     * A new activity gets a fresh space, sized to the frame as it stands now. The
     * store has already cleared the strokes by this point, so nothing is left
     * behind in the old space.
     *
     * Re-freezing to `box` and not to `null` is load-bearing: a new guide does not
     * change the frame's size, so no further `onLayout` would arrive to replace a
     * null, and the render branch below — which needs `base` to write a viewBox —
     * would sit on its fallback for the rest of the screen's life.
     */
    setBase((prev) => {
      if (box.w <= 0 || box.h <= 0) return prev;
      if (prev && prev.w === box.w && prev.h === box.h) return prev;
      return { w: box.w, h: box.h };
    });
    // Deliberately keyed on the guide alone: `box` is read as "the size right
    // now", and depending on it would re-freeze the space on every resize, which
    // is the whole thing this component exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideName]);

  /**
   * Refreshes the frame's page origin, which the PanResponder subtracts to get a
   * local coordinate, and — when a caller wants it — reports where the guide
   * starts and ends on screen so the tutorial hand can follow it.
   *
   * The measurement is unconditional. It used to bail out before touching
   * `offsetRef` when `onGuideLayout` was absent, which is the desktop variant, so
   * desktop's origin sat at {0,0} for the life of the screen and capture fell
   * through to the `pageX - locationX` guess below.
   */
  const measureFrame = useCallback(() => {
    containerRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      if (pageX === undefined || pageY === undefined) return;
      offsetRef.current = { x: pageX, y: pageY };

      if (!onGuideLayout || !base) return;
      const guidePts = getGuidePoints(guideName, base.w, base.h);
      if (guidePts.length < 2) return;
      /* Guide points are in the frozen space; the hand needs screen pixels. */
      const { scale, dx, dy } = fitRef.current;
      const first = guidePts[0];
      const last = guidePts[guidePts.length - 1];
      onGuideLayout(
        pageX + dx + first.x * scale,
        pageY + dy + first.y * scale,
        pageX + dx + last.x * scale,
        pageY + dy + last.y * scale,
      );
    });
  }, [base, guideName, onGuideLayout]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    if (w > 0 && h > 0) setBase((prev) => prev ?? { w, h });
  };

  useEffect(() => {
    if (box.w <= 0 || box.h <= 0) return;
    measureFrame();
    /* Once more after layout settles: `measure` can report a stale page origin
       on the same frame the view was laid out in. */
    const timer = setTimeout(measureFrame, 150);
    return () => clearTimeout(timer);
  }, [box, measureFrame]);

  // Generate SVG path string or canvas drawing instructions for guides
  const getGuideDetails = () => {
    const w = base?.w ?? 300;
    const h = base?.h ?? 300;

    switch (guideName) {
      case 'Standing Line':
        return {
          d: `M ${w / 2} ${h * 0.15} L ${w / 2} ${h * 0.85}`,
          points: [
            { x: w / 2, y: h * 0.15 },
            { x: w / 2, y: h * 0.85 },
          ],
        };
      case 'Sleeping Line':
        return {
          d: `M ${w * 0.15} ${h / 2} L ${w * 0.85} ${h / 2}`,
          points: [
            { x: w * 0.15, y: h / 2 },
            { x: w * 0.85, y: h / 2 },
          ],
        };
      case 'Left Slanting Line':
        return {
          d: `M ${w * 0.75} ${h * 0.2} L ${w * 0.25} ${h * 0.8}`,
          points: [
            { x: w * 0.75, y: h * 0.2 },
            { x: w * 0.25, y: h * 0.8 },
          ],
        };
      case 'Right Slanting Line':
        return {
          d: `M ${w * 0.25} ${h * 0.2} L ${w * 0.75} ${h * 0.8}`,
          points: [
            { x: w * 0.25, y: h * 0.2 },
            { x: w * 0.75, y: h * 0.8 },
          ],
        };
      case 'Big Curve':
        return {
          d: `M ${w * 0.7} ${h * 0.2} Q ${w * 0.2} ${h / 2} ${w * 0.7} ${h * 0.8}`,
          points: [
            { x: w * 0.7, y: h * 0.2 },
            { x: w * 0.2, y: h / 2 },
            { x: w * 0.7, y: h * 0.8 },
          ],
        };
      case 'Small Curve':
        return {
          d: `M ${w * 0.6} ${h * 0.3} Q ${w * 0.3} ${h / 2} ${w * 0.6} ${h * 0.7}`,
          points: [
            { x: w * 0.6, y: h * 0.3 },
            { x: w * 0.3, y: h / 2 },
            { x: w * 0.6, y: h * 0.7 },
          ],
        };
      case 'Semi Circle': {
        const cx = w * 0.5;
        const cy = h * 0.5;
        const r = h * 0.3;
        return {
          d: `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r}`,
          points: Array.from({ length: 18 }).map((_, i) => {
            const angle = -Math.PI / 2 + (i * Math.PI) / 18;
            return {
              x: cx - r * Math.cos(angle), // curves to the left
              y: cy + r * Math.sin(angle),
            };
          }),
        };
      }
      case 'Reverse Semi Circle': {
        const cx = w * 0.5;
        const cy = h * 0.5;
        const r = h * 0.3;
        return {
          d: `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`,
          points: Array.from({ length: 18 }).map((_, i) => {
            const angle = -Math.PI / 2 + (i * Math.PI) / 18;
            return {
              x: cx + r * Math.cos(angle), // curves to the right
              y: cy + r * Math.sin(angle),
            };
          }),
        };
      }
      case 'Zig-zag':
        return {
          d: `M ${w * 0.15} ${h * 0.6} L ${w * 0.325} ${h * 0.3} L ${w * 0.5} ${h * 0.6} L ${w * 0.675} ${h * 0.3} L ${w * 0.85} ${h * 0.6}`,
        };
      case 'Spiral': {
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.min(w, h) * 0.35;
        let dStr = '';
        const pts: Point[] = [];
        for (let i = 0; i < 72; i++) {
          const angle = (i * 10 * Math.PI) / 180;
          const r = (maxR * i) / 72;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          dStr += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
          pts.push({ x, y });
        }
        return { d: dStr, points: pts };
      }
      case 'Loop': {
        let dStr = `M ${w * 0.15} ${h * 0.5}`;
        const pts: Point[] = [];
        for (let i = 0; i <= 60; i++) {
          const t = i / 60;
          const x = w * 0.15 + (w * 0.7) * t;
          const y = h * 0.5 + h * 0.15 * Math.sin(t * 3 * 2 * Math.PI) + h * 0.08 * Math.cos(t * 3 * 2 * Math.PI);
          dStr += ` L ${x} ${y}`;
          pts.push({ x, y });
        }
        return { d: dStr, points: pts };
      }
      case 'Combined Curves':
        return {
          d: `M ${w * 0.15} ${h * 0.5} Q ${w * 0.325} ${h * 0.2} ${w * 0.5} ${h * 0.5} T ${w * 0.85} ${h * 0.5}`,
        };
      case 'Left Curve':
        return {
          d: `M ${w * 0.7} ${h * 0.2} Q ${w * 0.2} ${h / 2} ${w * 0.7} ${h * 0.8}`,
          points: [
            { x: w * 0.7, y: h * 0.2 },
            { x: w * 0.2, y: h / 2 },
            { x: w * 0.7, y: h * 0.8 },
          ],
        };
      case 'Right Curve':
        return {
          d: `M ${w * 0.3} ${h * 0.2} Q ${w * 0.8} ${h / 2} ${w * 0.3} ${h * 0.8}`,
        };
      case 'Zigzag Pattern':
        return {
          d: `M ${w * 0.15} ${h * 0.6} L ${w * 0.325} ${h * 0.3} L ${w * 0.5} ${h * 0.6} L ${w * 0.675} ${h * 0.3} L ${w * 0.85} ${h * 0.6}`,
        };
      case 'Wave Pattern':
        return {
          d: `M ${w * 0.15} ${h * 0.5} Q ${w * 0.325} ${h * 0.2} ${w * 0.5} ${h * 0.5} T ${w * 0.85} ${h * 0.5}`,
        };
      case 'Triangle':
        return {
          d: `M ${w / 2} ${h * 0.2} L ${w * 0.8} ${h * 0.8} L ${w * 0.2} ${h * 0.8} Z`,
        };
      case 'Square':
        return {
          d: `M ${w * 0.2} ${h * 0.2} L ${w * 0.8} ${h * 0.2} L ${w * 0.8} ${h * 0.8} L ${w * 0.2} ${h * 0.8} Z`,
        };
      case 'Rectangle':
        return {
          d: `M ${w * 0.15} ${h * 0.25} L ${w * 0.85} ${h * 0.25} L ${w * 0.85} ${h * 0.75} L ${w * 0.15} ${h * 0.75} Z`,
        };
      case 'Oval':
        return {
          d: `M ${w / 2} ${h * 0.25} A ${w * 0.35} ${h * 0.25} 0 1 1 ${w / 2 - 0.01} ${h * 0.25}`,
        };
      case 'Star': {
        const cx = w / 2;
        const cy = h / 2;
        const outerR = Math.min(w, h) * 0.35;
        const innerR = outerR * 0.4;
        let dStr = '';
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          dStr += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        }
        dStr += 'Z';
        return { d: dStr };
      }
      case 'Heart':
        return {
          d: `M ${w / 2} ${h * 0.3} C ${w * 0.2} ${h * 0.1} ${w * 0.1} ${h * 0.55} ${w / 2} ${h * 0.85} C ${w * 0.9} ${h * 0.55} ${w * 0.8} ${h * 0.1} ${w / 2} ${h * 0.3} Z`,
        };
      case 'Diamond':
        return {
          d: `M ${w / 2} ${h * 0.2} L ${w * 0.8} ${h / 2} L ${w / 2} ${h * 0.8} L ${w * 0.2} ${h / 2} Z`,
        };
      case 'Pentagon': {
        const cx = w / 2;
        const cy = h / 2 + 10;
        const r = Math.min(w, h) * 0.32;
        let dStr = '';
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          dStr += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        }
        dStr += 'Z';
        return { d: dStr };
      }
      case 'Hexagon': {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.32;
        let dStr = '';
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          dStr += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        }
        dStr += 'Z';
        return { d: dStr };
      }
      case 'Circle': {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.3;
        return {
          d: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`,
          points: Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 10 * Math.PI) / 180;
            return {
              x: cx + r * Math.cos(angle),
              y: cy + r * Math.sin(angle),
            };
          }),
        };
      }
      // === LETTER GUIDES A-Z ===
      case 'Letter A':
        return {
          d: `M ${w / 2} ${h * 0.2} L ${w * 0.25} ${h * 0.8} M ${w / 2} ${h * 0.2} L ${w * 0.75} ${h * 0.8} M ${w * 0.35} ${h * 0.55} L ${w * 0.65} ${h * 0.55}`,
          paths: [
            `M ${w / 2} ${h * 0.2} L ${w * 0.25} ${h * 0.8}`,
            `M ${w / 2} ${h * 0.2} L ${w * 0.75} ${h * 0.8}`,
            `M ${w * 0.35} ${h * 0.55} L ${w * 0.65} ${h * 0.55}`,
          ],
        };
      case 'Letter B': {
        // Vertical line + two bumps as polylines
        const bumpTop: string[] = [];
        const bumpBot: string[] = [];
        for (let i = 0; i <= 16; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 16;
          bumpTop.push(`${w * 0.3 + w * 0.22 * Math.cos(a)} ${h * 0.35 + h * 0.15 * Math.sin(a)}`);
        }
        for (let i = 0; i <= 16; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 16;
          bumpBot.push(`${w * 0.3 + w * 0.25 * Math.cos(a)} ${h * 0.65 + h * 0.15 * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} ${bumpTop.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')} ${bumpBot.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')}`,
        };
      }
      case 'Letter C': {
        // Open arc as polyline
        const pts: string[] = [];
        const cx = w * 0.5, cy = h * 0.5, rx = w * 0.28, ry = h * 0.3;
        for (let i = 0; i <= 24; i++) {
          const a = -2.4 + (i * 4.8) / 24; // from ~-2.4 to ~2.4 radians (open on right)
          pts.push(`${cx - rx * Math.cos(a)} ${cy + ry * Math.sin(a)}`);
        }
        return { d: `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')}` };
      }
      case 'Letter D': {
        // Vertical line + right bump as polyline
        const bump: string[] = [];
        for (let i = 0; i <= 20; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 20;
          bump.push(`${w * 0.3 + w * 0.28 * Math.cos(a)} ${h * 0.5 + h * 0.3 * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} ${bump.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')}`,
        };
      }
      case 'Letter E':
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} M ${w * 0.3} ${h * 0.2} L ${w * 0.7} ${h * 0.2} M ${w * 0.3} ${h * 0.5} L ${w * 0.65} ${h * 0.5} M ${w * 0.3} ${h * 0.8} L ${w * 0.7} ${h * 0.8}`,
        };
      case 'Letter F':
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} M ${w * 0.3} ${h * 0.2} L ${w * 0.7} ${h * 0.2} M ${w * 0.3} ${h * 0.5} L ${w * 0.65} ${h * 0.5}`,
        };
      case 'Letter G': {
        // Open arc + horizontal bar
        const pts: string[] = [];
        const cx = w * 0.5, cy = h * 0.5, rx = w * 0.25, ry = h * 0.3;
        for (let i = 0; i <= 22; i++) {
          const a = -0.4 + (i * (2 * Math.PI - 0.8)) / 22;
          pts.push(`${cx + rx * Math.cos(a)} ${cy - ry * Math.sin(a)}`);
        }
        return {
          d: `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} M ${w * 0.75} ${h * 0.5} L ${w * 0.5} ${h * 0.5}`,
        };
      }
      case 'Letter H':
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} M ${w * 0.7} ${h * 0.2} L ${w * 0.7} ${h * 0.8} M ${w * 0.3} ${h * 0.5} L ${w * 0.7} ${h * 0.5}`,
        };
      case 'Letter I':
        return {
          d: `M ${w * 0.35} ${h * 0.2} L ${w * 0.65} ${h * 0.2} M ${w / 2} ${h * 0.2} L ${w / 2} ${h * 0.8} M ${w * 0.35} ${h * 0.8} L ${w * 0.65} ${h * 0.8}`,
        };
      case 'Letter J': {
        // Vertical line + hook curve
        const hook: string[] = [];
        for (let i = 0; i <= 12; i++) {
          const a = (i * Math.PI) / 12;
          hook.push(`${w * 0.42 + w * 0.13 * Math.cos(a)} ${h * 0.65 + h * 0.15 * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.35} ${h * 0.2} L ${w * 0.65} ${h * 0.2} M ${w * 0.55} ${h * 0.2} L ${w * 0.55} ${h * 0.65} ${hook.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')}`,
        };
      }
      case 'Letter K':
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} M ${w * 0.7} ${h * 0.2} L ${w * 0.3} ${h * 0.5} L ${w * 0.7} ${h * 0.8}`,
        };
      case 'Letter L':
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} L ${w * 0.7} ${h * 0.8}`,
        };
      case 'Letter M':
        return {
          d: `M ${w * 0.2} ${h * 0.8} L ${w * 0.2} ${h * 0.2} L ${w / 2} ${h * 0.55} L ${w * 0.8} ${h * 0.2} L ${w * 0.8} ${h * 0.8}`,
        };
      case 'Letter N':
        return {
          d: `M ${w * 0.25} ${h * 0.8} L ${w * 0.25} ${h * 0.2} L ${w * 0.75} ${h * 0.8} L ${w * 0.75} ${h * 0.2}`,
        };
      case 'Letter O': {
        const pts: string[] = [];
        const cx = w / 2, cy = h / 2, rx = w * 0.25, ry = h * 0.3;
        for (let i = 0; i <= 36; i++) {
          const a = (i * 2 * Math.PI) / 36;
          pts.push(`${cx + rx * Math.cos(a)} ${cy + ry * Math.sin(a)}`);
        }
        return { d: `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} Z` };
      }
      case 'Letter P': {
        const bump: string[] = [];
        for (let i = 0; i <= 16; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 16;
          bump.push(`${w * 0.3 + w * 0.25 * Math.cos(a)} ${h * 0.35 + h * 0.15 * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} ${bump.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')}`,
        };
      }
      case 'Letter Q': {
        const pts: string[] = [];
        const cx = w / 2, cy = h * 0.45, rx = w * 0.25, ry = h * 0.25;
        for (let i = 0; i <= 36; i++) {
          const a = (i * 2 * Math.PI) / 36;
          pts.push(`${cx + rx * Math.cos(a)} ${cy + ry * Math.sin(a)}`);
        }
        return { d: `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} Z M ${w * 0.55} ${h * 0.6} L ${w * 0.72} ${h * 0.82}` };
      }
      case 'Letter R': {
        const bump: string[] = [];
        for (let i = 0; i <= 16; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 16;
          bump.push(`${w * 0.3 + w * 0.25 * Math.cos(a)} ${h * 0.35 + h * 0.15 * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.8} ${bump.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')} M ${w * 0.45} ${h * 0.5} L ${w * 0.7} ${h * 0.8}`,
        };
      }
      case 'Letter S': {
        // S-curve as polyline (top arc + bottom arc)
        const pts: string[] = [];
        const r = h * 0.14;
        // top curve (going right then down-left)
        for (let i = 0; i <= 14; i++) {
          const a = -Math.PI * 0.8 + (i * Math.PI * 1.3) / 14;
          pts.push(`${w * 0.5 - r * Math.cos(a)} ${h * 0.33 - r * Math.sin(a)}`);
        }
        // bottom curve (going left then down-right)
        for (let i = 0; i <= 14; i++) {
          const a = -Math.PI * 0.8 + (i * Math.PI * 1.3) / 14;
          pts.push(`${w * 0.5 + r * Math.cos(a)} ${h * 0.67 + r * Math.sin(a)}`);
        }
        return { d: `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')}` };
      }
      case 'Letter T':
        return {
          d: `M ${w * 0.2} ${h * 0.2} L ${w * 0.8} ${h * 0.2} M ${w / 2} ${h * 0.2} L ${w / 2} ${h * 0.8}`,
        };
      case 'Letter U': {
        // Two verticals + bottom curve
        const curve: string[] = [];
        for (let i = 0; i <= 16; i++) {
          const a = Math.PI + (i * Math.PI) / 16;
          curve.push(`${w * 0.5 + w * 0.25 * Math.cos(a)} ${h * 0.6 - h * 0.2 * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.25} ${h * 0.2} L ${w * 0.25} ${h * 0.6} ${curve.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')} M ${w * 0.75} ${h * 0.6} L ${w * 0.75} ${h * 0.2}`,
        };
      }
      case 'Letter V':
        return {
          d: `M ${w * 0.2} ${h * 0.2} L ${w / 2} ${h * 0.8} L ${w * 0.8} ${h * 0.2}`,
        };
      case 'Letter W':
        return {
          d: `M ${w * 0.1} ${h * 0.2} L ${w * 0.3} ${h * 0.8} L ${w * 0.5} ${h * 0.45} L ${w * 0.7} ${h * 0.8} L ${w * 0.9} ${h * 0.2}`,
        };
      case 'Letter X':
        return {
          d: `M ${w * 0.25} ${h * 0.2} L ${w * 0.75} ${h * 0.8} M ${w * 0.75} ${h * 0.2} L ${w * 0.25} ${h * 0.8}`,
        };
      case 'Letter Y':
        return {
          d: `M ${w * 0.25} ${h * 0.2} L ${w / 2} ${h * 0.5} M ${w * 0.75} ${h * 0.2} L ${w / 2} ${h * 0.5} M ${w / 2} ${h * 0.5} L ${w / 2} ${h * 0.8}`,
        };
      case 'Letter Z':
        return {
          d: `M ${w * 0.25} ${h * 0.2} L ${w * 0.75} ${h * 0.2} L ${w * 0.25} ${h * 0.8} L ${w * 0.75} ${h * 0.8}`,
        };

      // === NUMBER GUIDES 0-9 ===
      case 'Number 0': {
        const pts: string[] = [];
        const cx = w / 2, cy = h / 2, rx = w * 0.2, ry = h * 0.3;
        for (let i = 0; i <= 36; i++) {
          const a = (i * 2 * Math.PI) / 36;
          pts.push(`${cx + rx * Math.cos(a)} ${cy + ry * Math.sin(a)}`);
        }
        return { d: `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} Z` };
      }
      case 'Number 1':
        return {
          d: `M ${w * 0.4} ${h * 0.25} L ${w / 2} ${h * 0.2} L ${w / 2} ${h * 0.8} M ${w * 0.35} ${h * 0.8} L ${w * 0.65} ${h * 0.8}`,
        };
      case 'Number 2': {
        // Top curve + diagonal + base
        const curve: string[] = [];
        const r = h * 0.15;
        for (let i = 0; i <= 14; i++) {
          const a = -Math.PI + (i * Math.PI * 1.2) / 14;
          curve.push(`${w * 0.5 + r * Math.cos(a)} ${h * 0.35 + r * Math.sin(a)}`);
        }
        return {
          d: `M ${curve[0]} ${curve.slice(1).map(p => `L ${p}`).join(' ')} L ${w * 0.3} ${h * 0.8} L ${w * 0.7} ${h * 0.8}`,
        };
      }
      case 'Number 3': {
        // Two bumps as polylines
        const top: string[] = [];
        const bot: string[] = [];
        const r = h * 0.15;
        for (let i = 0; i <= 14; i++) {
          const a = -Math.PI * 0.7 + (i * Math.PI * 1.4) / 14;
          top.push(`${w * 0.48 + r * Math.cos(a)} ${h * 0.35 + r * Math.sin(a)}`);
        }
        for (let i = 0; i <= 14; i++) {
          const a = -Math.PI * 0.7 + (i * Math.PI * 1.4) / 14;
          bot.push(`${w * 0.48 + r * Math.cos(a)} ${h * 0.65 + r * Math.sin(a)}`);
        }
        return { d: `M ${top[0]} ${top.slice(1).map(p => `L ${p}`).join(' ')} M ${bot[0]} ${bot.slice(1).map(p => `L ${p}`).join(' ')}` };
      }
      case 'Number 4':
        return {
          d: `M ${w * 0.6} ${h * 0.2} L ${w * 0.25} ${h * 0.55} L ${w * 0.75} ${h * 0.55} M ${w * 0.6} ${h * 0.2} L ${w * 0.6} ${h * 0.8}`,
        };
      case 'Number 5': {
        // Top bar + vertical + bottom curve
        const curve: string[] = [];
        const r = h * 0.18;
        for (let i = 0; i <= 16; i++) {
          const a = -Math.PI * 0.6 + (i * Math.PI * 1.4) / 16;
          curve.push(`${w * 0.48 + r * Math.cos(a)} ${h * 0.62 + r * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.65} ${h * 0.2} L ${w * 0.3} ${h * 0.2} L ${w * 0.3} ${h * 0.48} M ${curve[0]} ${curve.slice(1).map(p => `L ${p}`).join(' ')}`,
        };
      }
      case 'Number 6': {
        // Diagonal line + bottom circle
        const circle: string[] = [];
        const r = h * 0.18;
        for (let i = 0; i <= 36; i++) {
          const a = (i * 2 * Math.PI) / 36;
          circle.push(`${w * 0.5 + r * Math.cos(a)} ${h * 0.62 + r * Math.sin(a)}`);
        }
        return {
          d: `M ${w * 0.6} ${h * 0.22} L ${w * 0.35} ${h * 0.5} M ${circle[0]} ${circle.slice(1).map(p => `L ${p}`).join(' ')} Z`,
        };
      }
      case 'Number 7':
        return {
          d: `M ${w * 0.3} ${h * 0.2} L ${w * 0.7} ${h * 0.2} L ${w * 0.4} ${h * 0.8}`,
        };
      case 'Number 8': {
        // Two circles
        const top: string[] = [];
        const bot: string[] = [];
        const r1 = h * 0.13, r2 = h * 0.15;
        for (let i = 0; i <= 24; i++) {
          const a = (i * 2 * Math.PI) / 24;
          top.push(`${w * 0.5 + r1 * Math.cos(a)} ${h * 0.35 + r1 * Math.sin(a)}`);
        }
        for (let i = 0; i <= 24; i++) {
          const a = (i * 2 * Math.PI) / 24;
          bot.push(`${w * 0.5 + r2 * Math.cos(a)} ${h * 0.65 + r2 * Math.sin(a)}`);
        }
        return { d: `M ${top[0]} ${top.slice(1).map(p => `L ${p}`).join(' ')} Z M ${bot[0]} ${bot.slice(1).map(p => `L ${p}`).join(' ')} Z` };
      }
      case 'Number 9': {
        // Top circle + tail
        const circle: string[] = [];
        const r = h * 0.18;
        for (let i = 0; i <= 36; i++) {
          const a = (i * 2 * Math.PI) / 36;
          circle.push(`${w * 0.5 + r * Math.cos(a)} ${h * 0.38 + r * Math.sin(a)}`);
        }
        return {
          d: `M ${circle[0]} ${circle.slice(1).map(p => `L ${p}`).join(' ')} Z M ${w * 0.7} ${h * 0.45} L ${w * 0.5} ${h * 0.8}`,
        };
      }
      case 'Slanting Line':
        return {
          d: `M ${w * 0.25} ${h * 0.2} L ${w * 0.75} ${h * 0.8}`,
        };
      default:
        // Square fallback
        return {
          d: `M ${w * 0.2} ${h * 0.2} L ${w * 0.8} ${h * 0.2} L ${w * 0.8} ${h * 0.8} L ${w * 0.2} ${h * 0.8} Z`,
          points: [],
        };
    }
  };

  const guide = getGuideDetails();

  // Web Canvas Drawing Sync
  useEffect(() => {
    if (Platform.OS !== 'web' || !canvasRef.current || !base) return;
    if (box.w <= 0 || box.h <= 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    /* The backing store is frame-sized, so clear in frame pixels... */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);
    /* ...then draw everything in the frozen space, scaled and centred exactly the
       way the native side's `preserveAspectRatio="xMidYMid meet"` does it. */
    const { scale, dx, dy } = fitRef.current;
    ctx.setTransform(scale, 0, 0, scale, dx, dy);

    // 1. Draw guide shape (dashed, low-contrast)
    ctx.strokeStyle = colors.traceGuide;
    ctx.lineWidth = 6;
    ctx.setLineDash([8, 8]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (guide.paths) {
      guide.paths.forEach((pStr) => {
        ctx.stroke(new Path2D(pStr));
      });
    } else {
      ctx.stroke(new Path2D(guide.d));
    }

    // 2. Draw user strokes (solid, TRACE green)
    ctx.strokeStyle = colors.leafGreen;
    ctx.lineWidth = 8;
    ctx.setLineDash([]);

    const drawStroke = (stroke: Point[]) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    };

    strokes.forEach(drawStroke);
    drawStroke(currentStroke);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, base, strokes, currentStroke, guideName]);

  // Web Touch Handlers using Ref for synchronous updates
  /** Client coords → frame-local pixels → the frozen space. */
  const webPoint = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return toBase(clientX - rect.left, clientY - rect.top);
  };

  const handleWebMouseDown = (e: React.MouseEvent) => {
    if (Platform.OS !== 'web') return;
    const point = webPoint(e.clientX, e.clientY);
    if (!point) return;
    const newStroke = [point];
    currentStrokeRef.current = newStroke;
    setCurrentStroke(newStroke);
  };

  const handleWebMouseMove = (e: React.MouseEvent) => {
    if (Platform.OS !== 'web' || currentStrokeRef.current.length === 0) return;
    const point = webPoint(e.clientX, e.clientY);
    if (!point) return;
    const updated = [...currentStrokeRef.current, point];
    currentStrokeRef.current = updated;
    setCurrentStroke(updated);
  };

  const handleWebMouseUp = () => {
    if (Platform.OS !== 'web') return;
    const finishedStroke = currentStrokeRef.current;
    if (finishedStroke.length > 0) {
      onAddStrokeRef.current(finishedStroke);
    }
    currentStrokeRef.current = [];
    setCurrentStroke([]);
  };

  const handleWebTouchStart = (e: React.TouchEvent) => {
    if (Platform.OS !== 'web') return;
    const touch = e.touches[0];
    if (!touch) return;
    const point = webPoint(touch.clientX, touch.clientY);
    if (!point) return;
    const newStroke = [point];
    currentStrokeRef.current = newStroke;
    setCurrentStroke(newStroke);
  };

  const handleWebTouchMove = (e: React.TouchEvent) => {
    if (Platform.OS !== 'web' || currentStrokeRef.current.length === 0) return;
    const touch = e.touches[0];
    if (!touch) return;
    const point = webPoint(touch.clientX, touch.clientY);
    if (!point) return;
    const updated = [...currentStrokeRef.current, point];
    currentStrokeRef.current = updated;
    setCurrentStroke(updated);
  };

  // Refs to track container screen coordinates for reliable relative touch coordinates on Android/iOS
  const containerXRef = useRef<number>(0);
  const containerYRef = useRef<number>(0);

  // Native touch using PanResponder — uses mutable ref to avoid stale closure
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
        let originX = offsetRef.current.x;
        let originY = offsetRef.current.y;
        if (originX === 0) {
          originX = pageX - locationX;
          originY = pageY - locationY;
        }
        containerXRef.current = originX;
        containerYRef.current = originY;

        const newStroke = [toBase(pageX - originX, pageY - originY)];
        currentStrokeRef.current = newStroke;
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const point = toBase(pageX - containerXRef.current, pageY - containerYRef.current);
        const updated = [...currentStrokeRef.current, point];
        currentStrokeRef.current = updated;
        setCurrentStroke(updated);
      },
      onPanResponderRelease: () => {
        const finishedStroke = currentStrokeRef.current;
        if (finishedStroke.length > 0) {
          onAddStrokeRef.current(finishedStroke);
        }
        currentStrokeRef.current = [];
        setCurrentStroke([]);
      },
    })
  ).current;

  // Render native SVG path string from user strokes, in the frozen space — the
  // viewBox below is what maps it onto the screen.
  const getNativeUserPath = () => {
    let d = '';
    const append = (stroke: Point[]) => {
      if (stroke.length === 0) return;
      d += ` M ${stroke[0].x} ${stroke[0].y}`;
      for (let i = 1; i < stroke.length; i++) {
        d += ` L ${stroke[i].x} ${stroke[i].y}`;
      }
    };
    strokes.forEach(append);
    append(currentStroke);
    return d;
  };

  return (
    <View style={styles.canvasContainer}>
      {/* Target Canvas Panel */}
      <View
        ref={containerRef}
        style={styles.canvasFrame}
        onLayout={handleLayout}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
      >
        {Platform.OS === 'web' ? (
          <canvas
            ref={canvasRef}
            width={box.w}
            height={box.h}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
            onMouseDown={handleWebMouseDown}
            onMouseMove={handleWebMouseMove}
            onMouseUp={handleWebMouseUp}
            onMouseLeave={handleWebMouseUp}
            onTouchStart={handleWebTouchStart}
            onTouchMove={handleWebTouchMove}
            onTouchEnd={handleWebMouseUp}
          />
        ) : Svg && Path && base ? (
          <Svg
            width={box.w}
            height={box.h}
            /* Guide and ink are both authored in the frozen space; the viewBox is
               the only thing that ever reacts to the frame changing size, so they
               can only ever move together. */
            viewBox={`0 0 ${base.w} ${base.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {/* Guide Path */}
            <Path
              d={guide.d}
              fill="none"
              stroke={colors.traceGuide}
              strokeWidth={6}
              strokeDasharray="8,8"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
            {/* User Path */}
            <Path
              d={getNativeUserPath()}
              fill="none"
              stroke={colors.leafGreen}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          </Svg>
        ) : (
          <View style={styles.centerFallback}>
            <Text style={styles.fallbackText}>Native Drawing Canvas fallback</Text>
          </View>
        )}
      </View>

      {/* Toolbox Panel */}
      <View style={styles.toolsRow}>
        <SecondaryButton
          label="Undo"
          icon="undo"
          size="sm"
          fullWidth={false}
          onPress={onUndo}
          disabled={strokes.length === 0}
          accessibilityHint="Removes your last stroke"
        />

        <SecondaryButton
          label="Clear"
          icon="eraser"
          size="sm"
          tone="danger"
          fullWidth={false}
          onPress={onClear}
          disabled={strokes.length === 0 && currentStroke.length === 0}
          accessibilityHint="Erases the whole drawing"
        />

        <PrimaryButton
          label="Check Tracing"
          icon="check"
          size="sm"
          tone="green"
          fullWidth={false}
          onPress={() => base && onComplete(base.w, base.h)}
          disabled={strokes.length === 0}
          accessibilityHint="Scores how closely you followed the guide"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    width: '100%',
    gap: spacing.md,
  },
  canvasFrame: {
    flex: 1,
    width: '100%',
    minHeight: 280,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  centerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    ...typography.presets.subtle,
    color: colors.textMuted,
  },
  toolsRow: {
    flexDirection: 'row',
    /* Wraps rather than squeezing the three controls below their touch target
       on a 360px screen (§27, §30). */
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
