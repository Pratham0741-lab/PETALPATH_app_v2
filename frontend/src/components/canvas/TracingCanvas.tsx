import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, PanResponder, DimensionValue } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { Point } from '../../store/writeStore';
import { Ionicons } from '@expo/vector-icons';

// We import react-native-svg dynamically or capture require to prevent web bundling crashes
let Svg: any = null;
let Path: any = null;
if (Platform.OS !== 'web') {
  try {
    const SvgLib = require('react-native-svg');
    Svg = SvgLib.default || SvgLib.Svg;
    Path = SvgLib.Path;
  } catch (e) {
    console.warn('react-native-svg not available on native:', e);
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
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
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

  const reportGuideLayout = useCallback((w: number, h: number) => {
    if (!onGuideLayout) return;
    containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (pageX !== undefined && pageY !== undefined) {
        offsetRef.current = { x: pageX, y: pageY };
        const guidePts = getGuidePoints(guideName, w, h);
        if (guidePts.length >= 2) {
          const first = guidePts[0];
          const last = guidePts[guidePts.length - 1];
          onGuideLayout(
            pageX + first.x,
            pageY + first.y,
            pageX + last.x,
            pageY + last.y
          );
        }
      }
    });
  }, [guideName, onGuideLayout]);

  const handleLayout = (event: any) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setWidth(w);
    setHeight(h);

    reportGuideLayout(w, h);
    // Run again with a short timeout to handle layout settling
    setTimeout(() => {
      reportGuideLayout(w, h);
    }, 150);
  };

  useEffect(() => {
    if (width > 0 && height > 0) {
      reportGuideLayout(width, height);
    }
  }, [guideName, width, height, reportGuideLayout]);

  // Generate SVG path string or canvas drawing instructions for guides
  const getGuideDetails = () => {
    const w = width || 300;
    const h = height || 300;

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
      case 'Letter A':
        return {
          d: `M ${w / 2} ${h * 0.2} L ${w * 0.25} ${h * 0.8} M ${w / 2} ${h * 0.2} L ${w * 0.75} ${h * 0.8} M ${w * 0.35} ${h * 0.55} L ${w * 0.65} ${h * 0.55}`,
          paths: [
            `M ${w / 2} ${h * 0.2} L ${w * 0.25} ${h * 0.8}`,
            `M ${w / 2} ${h * 0.2} L ${w * 0.75} ${h * 0.8}`,
            `M ${w * 0.35} ${h * 0.55} L ${w * 0.65} ${h * 0.55}`,
          ],
        };
      case 'Number 1':
        return {
          d: `M ${w * 0.4} ${h * 0.25} L ${w / 2} ${h * 0.2} L ${w / 2} ${h * 0.8} M ${w * 0.35} ${h * 0.8} L ${w * 0.65} ${h * 0.8}`,
          paths: [
            `M ${w * 0.4} ${h * 0.25} L ${w / 2} ${h * 0.2}`,
            `M ${w / 2} ${h * 0.2} L ${w / 2} ${h * 0.8}`,
            `M ${w * 0.35} ${h * 0.8} L ${w * 0.65} ${h * 0.8}`,
          ],
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
    if (Platform.OS === 'web' && canvasRef.current && width > 0 && height > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);

        // 1. Draw guide shape (dashed gray)
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 6;
        ctx.setLineDash([8, 8]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (guide.paths) {
          guide.paths.forEach((pStr) => {
            const p = new Path2D(pStr);
            ctx.stroke(p);
          });
        } else {
          const p = new Path2D(guide.d);
          ctx.stroke(p);
        }

        // 2. Draw user strokes (solid purple)
        ctx.strokeStyle = colors.purple;
        ctx.lineWidth = 8;
        ctx.setLineDash([]);

        strokes.forEach((stroke) => {
          if (stroke.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
          }
          ctx.stroke();
        });

        // Current ongoing stroke
        if (currentStroke.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
          for (let i = 1; i < currentStroke.length; i++) {
            ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
          }
          ctx.stroke();
        }
      }
    }
  }, [width, height, strokes, currentStroke, guideName]);

  // Web Touch Handlers using Ref for synchronous updates
  const handleWebMouseDown = (e: React.MouseEvent) => {
    if (Platform.OS !== 'web') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newStroke = [{ x, y }];
    currentStrokeRef.current = newStroke;
    setCurrentStroke(newStroke);
  };

  const handleWebMouseMove = (e: React.MouseEvent) => {
    if (Platform.OS !== 'web' || currentStrokeRef.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const updated = [...currentStrokeRef.current, { x, y }];
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const newStroke = [{ x, y }];
    currentStrokeRef.current = newStroke;
    setCurrentStroke(newStroke);
  };

  const handleWebTouchMove = (e: React.TouchEvent) => {
    if (Platform.OS !== 'web' || currentStrokeRef.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const updated = [...currentStrokeRef.current, { x, y }];
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
        let baseRefX = offsetRef.current.x;
        let baseRefY = offsetRef.current.y;
        if (baseRefX === 0) {
          baseRefX = pageX - locationX;
          baseRefY = pageY - locationY;
        }
        containerXRef.current = baseRefX;
        containerYRef.current = baseRefY;

        const x = pageX - baseRefX;
        const y = pageY - baseRefY;
        const newStroke = [{ x, y }];
        currentStrokeRef.current = newStroke;
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const x = pageX - containerXRef.current;
        const y = pageY - containerYRef.current;
        const updated = [...currentStrokeRef.current, { x, y }];
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

  // Render native SVG path string from user strokes
  const getNativeUserPath = () => {
    let d = '';
    strokes.forEach((stroke) => {
      if (stroke.length > 0) {
        d += ` M ${stroke[0].x} ${stroke[0].y}`;
        for (let i = 1; i < stroke.length; i++) {
          d += ` L ${stroke[i].x} ${stroke[i].y}`;
        }
      }
    });
    if (currentStroke.length > 0) {
      d += ` M ${currentStroke[0].x} ${currentStroke[0].y}`;
      for (let i = 1; i < currentStroke.length; i++) {
        d += ` L ${currentStroke[i].x} ${currentStroke[i].y}`;
      }
    }
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
            width={width}
            height={height}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
            onMouseDown={handleWebMouseDown}
            onMouseMove={handleWebMouseMove}
            onMouseUp={handleWebMouseUp}
            onMouseLeave={handleWebMouseUp}
            onTouchStart={handleWebTouchStart}
            onTouchMove={handleWebTouchMove}
            onTouchEnd={handleWebMouseUp}
          />
        ) : Svg && Path ? (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Guide Path */}
            <Path
              d={guide.d}
              fill="none"
              stroke="#D1D5DB"
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
              stroke={colors.purple}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          </Svg>
        ) : (
          <View style={styles.centerFallback}>
            <Text style={{ color: colors.textMuted }}>Native Drawing Canvas fallback</Text>
          </View>
        )}
      </View>

      {/* Toolbox Panel */}
      <View style={styles.toolsRow}>
        <Pressable
          style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
          onPress={onUndo}
          disabled={strokes.length === 0}
        >
          <Ionicons name="arrow-undo-outline" size={20} color={strokes.length === 0 ? colors.border : colors.purple} />
          <Text style={[styles.toolBtnText, strokes.length === 0 && { color: colors.border }]}>Undo</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
          onPress={onClear}
          disabled={strokes.length === 0 && currentStroke.length === 0}
        >
          <Ionicons name="trash-outline" size={20} color={strokes.length === 0 ? colors.border : '#FF4A4A'} />
          <Text style={[styles.toolBtnText, { color: strokes.length === 0 ? colors.border : '#FF4A4A' }]}>Clear</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.doneBtn,
            strokes.length === 0 && styles.doneBtnDisabled,
            pressed && strokes.length > 0 && styles.toolBtnPressed,
          ]}
          onPress={() => onComplete(width, height)}
          disabled={strokes.length === 0}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
          <Text style={styles.doneBtnText}>Check Tracing</Text>
        </Pressable>
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
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  centerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  toolBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.purple,
  },
  doneBtnDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  doneBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
