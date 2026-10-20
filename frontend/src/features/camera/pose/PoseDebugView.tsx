/**
 * Developer-only pose debug view: landmarks over the preview, the pose score
 * against its pass mark, every check's score, the landmark holding the pose
 * back, and the rolling window.
 *
 * Imported only behind EXPO_PUBLIC_ENABLE_DEV_TOOLS (see CameraActivityLesson),
 * so production bundles do not contain it; scripts/check-prod-bundle.mjs looks
 * for the POSE_DEBUG_VIEW marker below to prove that.
 *
 * Landmark dots assume the preview shows the whole camera frame; with a
 * cover-cropped preview they drift a little at the edges. Good enough to see
 * which joint the model lost, which is what this is for.
 */
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import type { PoseScore } from './poseScorer';

export const POSE_DEBUG_VIEW = 'POSE_DEBUG_VIEW';

interface Props {
  debug: PoseScore | undefined;
  validatorName?: string;
  windowHits: number;
  windowFrames: number;
  windowPassing: boolean;
  holdMs: number;
  targetHoldMs: number;
}

const pct = (v: number) => `${Math.round(v * 100)}`;

export const PoseDebugView: React.FC<Props> = ({
  debug,
  validatorName,
  windowHits,
  windowFrames,
  windowPassing,
  holdMs,
  targetHoldMs,
}) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const failing = new Set(debug?.failing?.landmarks ?? []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID={POSE_DEBUG_VIEW} onLayout={onLayout}>
      {debug?.points.map((p) => (
        <View
          key={p.name}
          style={[
            styles.dot,
            {
              left: p.x * size.w - 5,
              top: p.y * size.h - 5,
              opacity: p.visibility < 0.3 ? 0.25 : 1,
              backgroundColor: failing.has(p.name) ? '#ff3b30' : p.visibility < 0.3 ? '#999' : '#34c759',
            },
          ]}
        />
      ))}

      <View style={styles.panel}>
        <Text style={styles.title}>
          {debug?.validator ?? validatorName ?? '—'} {debug ? (debug.pass ? 'PASS' : 'miss') : '(primitive)'}
        </Text>
        {debug ? (
          <>
            <Text style={styles.line}>
              score {pct(debug.score)} / pass {pct(debug.passScore)}  cover {pct(debug.coverage)}%
              {debug.mirrored ? '  mirrored' : ''}  torso {debug.scale.toFixed(2)}
            </Text>
            {debug.checks.map((c) => (
              <Text key={c.id} style={[styles.line, debug.failing?.id === c.id && styles.bad]}>
                {c.required ? '*' : ' '}
                {c.id}: {c.score === null ? 'not visible' : pct(c.score)}
                {c.value !== null ? `  (${c.value.toFixed(2)})` : ''}
              </Text>
            ))}
            {debug.failing ? (
              <Text style={[styles.line, styles.bad]}>
                failing {debug.failing.id} [{debug.failing.landmarks.join(', ') || 'not visible'}]
              </Text>
            ) : null}
          </>
        ) : null}
        <Text style={styles.line}>
          window {windowHits}/{windowFrames} {windowPassing ? 'OK' : '..'}  hold {Math.round(holdMs)}/{targetHoldMs} ms
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#000' },
  panel: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    maxWidth: '90%',
  },
  title: { color: '#fff', fontSize: 12, fontWeight: '700' },
  line: { color: '#ddd', fontSize: 10, fontFamily: 'monospace' },
  bad: { color: '#ff6b60' },
});

export default PoseDebugView;
