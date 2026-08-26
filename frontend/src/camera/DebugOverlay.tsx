import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { cameraEngine } from './CameraEngine';
import { DiagnosticMetrics } from './CameraTypes';
import { PetalIcon } from '../components/icons';

/**
 * Camera engine diagnostics. Developer-facing, deliberately styled as a terminal
 * readout rather than on the child-facing design system.
 *
 * `isVisible` used to default to `true` unconditionally, so a release build put a
 * black diagnostics slab at `zIndex: 9999` over the camera preview a five-year-old
 * was meant to be looking at. It now defaults to expanded in development and
 * collapsed in production — the mini badge is still there in both, one tap away.
 *
 * Note for the outstanding camera verification: `npx expo run:android` produces a
 * debug build, where `__DEV__` is true, so that flow is unchanged and the panel
 * still opens by itself showing `State` / `Camera FPS` / `Watchdog`.
 *
 * The terminal styling is intentional and stays, but the two *controls* were the
 * text characters `⚡` and `✕`. Since the mini badge ships in release builds and
 * is tappable by a child, both are real glyphs now (§7) — the monospace-readout
 * look is unaffected.
 */
export const DebugOverlay: React.FC<{ isVisible?: boolean }> = ({ isVisible = __DEV__ }) => {
  const [expanded, setExpanded] = useState(isVisible);
  const [metrics, setMetrics] = useState<DiagnosticMetrics | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const interval = setInterval(async () => {
      const data = await cameraEngine.getMetrics();
      setMetrics(data);
    }, 500);

    return () => clearInterval(interval);
  }, [expanded]);

  if (!expanded) {
    return (
      <TouchableOpacity
        style={styles.miniBadge}
        onPress={() => setExpanded(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Show camera engine metrics"
      >
        <PetalIcon name="chart" size={12} color="#00FFCC" filled />
        <Text style={styles.miniText}>Metrics</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PetalPath Camera Engine v3 (Phase 2 Pose Engine)</Text>
        <TouchableOpacity
          onPress={() => setExpanded(false)}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Hide camera engine metrics"
        >
          <PetalIcon name="close" size={14} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {metrics ? (
        <View style={styles.content}>
          {metrics.watchdogAlert === 'NATIVE_MODULE_MISSING' ? (
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>Native camera engine not in this build</Text>
              <Text style={styles.alertBody}>
                The JS bundle loaded, but the PetalPathCameraEngine native module is absent. Native
                code cannot ship over-the-air, so a JS/OTA update will not fix this.
              </Text>
              <Text style={styles.alertBody}>
                Run a fresh native build: `npx expo prebuild --clean -p android` then
                `npx expo run:android` (or a new EAS build).
              </Text>
            </View>
          ) : null}

          <Text style={styles.row}>
            State: <Text style={styles.val}>{metrics.cameraState}</Text> | Tracking:{' '}
            <Text style={styles.valHighlight}>{metrics.trackingState ?? 'SEARCHING'}</Text> | Posture:{' '}
            <Text style={styles.val}>{metrics.posture ?? 'UNKNOWN'}</Text>
          </Text>
          <Text style={styles.row}>
            Quality: <Text style={styles.valGood}>{metrics.qualityScore ?? 0}/100</Text> | Stability:{' '}
            <Text style={styles.valGood}>{metrics.stabilityScore ?? 0}/100</Text>
          </Text>
          <Text style={styles.row}>
            Camera FPS: <Text style={styles.val}>{metrics.cameraFps.toFixed(1)}</Text> | Inference FPS:{' '}
            <Text style={styles.val}>{metrics.inferenceFps.toFixed(1)}</Text>
          </Text>
          <Text style={styles.row}>
            Pipeline Breakdown:{' '}
            <Text style={styles.valSub}>
              Inf:{metrics.averageInferenceMs.toFixed(1)}m | Trk:{metrics.trackingMs ?? 0}m | Flt:{metrics.filteringMs ?? 0}m | Cal:{metrics.calibrationMs ?? 0}m
            </Text>
          </Text>
          <Text style={styles.row}>
            Losses/Recoveries: <Text style={styles.val}>{metrics.poseLosses ?? 0} / {metrics.recoveries ?? 0}</Text> | Queue:{' '}
            <Text style={styles.val}>{metrics.queueDepth}</Text>
          </Text>
          <Text style={styles.row}>
            Watchdog:{' '}
            <Text style={metrics.watchdogAlert === 'NORMAL' ? styles.valGood : styles.valBad}>
              {metrics.watchdogAlert}
            </Text>
          </Text>

          {metrics.modelMetadata && (
            <View style={styles.metaBox}>
              <Text style={styles.metaTitle}>Model: {metrics.modelMetadata.modelName} ({metrics.modelMetadata.delegateType})</Text>
              <Text style={styles.metaSub}>
                Input: {metrics.modelMetadata.inputResolutionWidth}x{metrics.modelMetadata.inputResolutionHeight} | Keypoints: {metrics.modelMetadata.keypointCount}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.loadingText}>Fetching diagnostic metrics...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    borderRadius: 8,
    padding: 12,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#333333',
  },
  miniBadge: {
    position: 'absolute',
    top: 40,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 9999,
  },
  miniText: { color: '#00FFCC', fontSize: 12, fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  // The title is long enough to push the close control off the row at 360px.
  title: { color: '#00FFCC', fontWeight: 'bold', fontSize: 12, flexShrink: 1 },
  content: { gap: 3 },
  row: { color: '#CCCCCC', fontSize: 11 },
  val: { color: '#FFFFFF', fontWeight: 'bold' },
  valHighlight: { color: '#FFCC00', fontWeight: 'bold' },
  valGood: { color: '#00FF66', fontWeight: 'bold' },
  valBad: { color: '#FF3366', fontWeight: 'bold' },
  valSub: { color: '#88E0FF', fontSize: 10 },
  loadingText: { color: '#AAAAAA', fontSize: 11, fontStyle: 'italic' },
  alertBox: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderColor: '#FF3366',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    gap: 4,
  },
  alertTitle: { color: '#FF3366', fontSize: 11, fontWeight: 'bold' },
  alertBody: { color: '#FFD6E0', fontSize: 10, lineHeight: 14 },
  metaBox: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#444444' },
  metaTitle: { color: '#FFCC00', fontSize: 11, fontWeight: 'bold' },
  metaSub: { color: '#AAAAAA', fontSize: 10 },
});

export default DebugOverlay;
