import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { DebugMetrics, CameraStatus } from '../types/camera.types';
import { PoseDetectionResult, ActivityEngineResult } from '../types/pose.types';

interface DebugOverlayProps {
  metrics: DebugMetrics;
  cameraStatus: CameraStatus;
  deviceFormatText?: string;
  poseResult?: PoseDetectionResult;
  activityResult?: ActivityEngineResult;
  isNativeReady?: boolean;
  hasPlugin?: boolean;
  lastFrameTimestamp?: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  metrics,
  cameraStatus,
  deviceFormatText,
  poseResult,
  activityResult,
  isNativeReady = false,
  hasPlugin = false,
  lastFrameTimestamp = 0,
}) => {
  const confidencePct = poseResult?.confidence
    ? Math.round(poseResult.confidence * 100)
    : 0;

  return (
    <View style={styles.overlay}>
      <Text style={styles.header}>DIAGNOSTIC PIPELINE OVERLAY</Text>
      
      {/* Stage 1 & 2 */}
      <View style={styles.row}>
        <Text style={styles.label}>Frame Processor:</Text>
        <Text style={[styles.value, metrics.fps > 0 ? styles.good : styles.warn]}>
          {metrics.fps > 0 ? 'RUNNING' : 'NOT RUNNING'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Native Plugin:</Text>
        <Text style={[styles.value, hasPlugin ? styles.good : styles.warn]}>
          {hasPlugin ? 'LOADED (detectPose)' : 'MISSING'}
        </Text>
      </View>

      {/* Stage 3 */}
      <View style={styles.row}>
        <Text style={styles.label}>MediaPipe C++:</Text>
        <Text style={[styles.value, isNativeReady ? styles.good : styles.warn]}>
          {isNativeReady ? 'INITIALIZED' : 'INITIALIZING...'}
        </Text>
      </View>

      {/* Stage 4 - 8 Performance Telemetry */}
      <View style={styles.row}>
        <Text style={styles.label}>Live FPS:</Text>
        <Text style={[styles.value, metrics.fps >= 20 ? styles.good : styles.warn]}>
          {metrics.fps} FPS
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Inference Latency:</Text>
        <Text style={styles.value}>{metrics.latencyMs} ms</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Frames Received:</Text>
        <Text style={styles.value}>{metrics.processedFrames}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Frames Dropped:</Text>
        <Text style={styles.value}>{metrics.droppedFrames}</Text>
      </View>

      <View style={styles.divider} />

      {/* Stage 9 & 10 Keypoint Validation */}
      <View style={styles.row}>
        <Text style={styles.label}>Pose Detected:</Text>
        <Text style={[styles.value, poseResult?.detected ? styles.good : styles.warn]}>
          {poseResult?.detected ? 'YES ✅' : 'NO ❌'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>33 Keypoints:</Text>
        <Text style={styles.value}>{poseResult?.landmarkCount ?? 0} / 33</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Confidence:</Text>
        <Text style={styles.value}>{confidencePct}%</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Last Timestamp:</Text>
        <Text style={styles.value}>{lastFrameTimestamp > 0 ? lastFrameTimestamp : 'N/A'}</Text>
      </View>

      {/* Stage 11 Activity Evaluation */}
      {activityResult ? (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Activity Goal:</Text>
            <Text style={styles.value}>{activityResult.activityType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Engine State:</Text>
            <Text
              style={[
                styles.value,
                activityResult.state === 'completed'
                  ? styles.good
                  : activityResult.state === 'detected'
                  ? styles.info
                  : styles.warn,
              ]}
            >
              {activityResult.state.toUpperCase()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Feedback:</Text>
            <Text style={[styles.value, styles.feedback]} numberOfLines={1}>
              {activityResult.feedback}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 999,
    minWidth: 230,
  },
  header: {
    fontSize: 9,
    color: '#FFD700',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 6,
  },
  label: {
    fontSize: 11,
    color: '#A0A0A0',
    marginRight: 8,
  },
  value: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  feedback: {
    fontSize: 10,
    maxWidth: 130,
  },
  good: {
    color: '#4CAF50',
  },
  warn: {
    color: '#FF9800',
  },
  info: {
    color: '#2196F3',
  },
});

export default DebugOverlay;
