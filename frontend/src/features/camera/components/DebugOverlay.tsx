import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { DebugMetrics, CameraStatus } from '../types/camera.types';
import { PoseDetectionResult, ActivityEngineResult } from '../types/pose.types';
import { QualityState } from '../config/quality';
import { DifficultyProfileMode } from '../config/difficulty';
import { colors, spacing, radius, typography } from '../../../theme';

interface DebugOverlayProps {
  metrics: DebugMetrics;
  cameraStatus: CameraStatus;
  deviceFormatText?: string;
  poseResult?: PoseDetectionResult;
  activityResult?: ActivityEngineResult;
  qualityState?: QualityState;
  difficultyMode?: DifficultyProfileMode;
  isCalibrated?: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  metrics,
  cameraStatus,
  deviceFormatText,
  poseResult,
  activityResult,
  qualityState = 'good',
  difficultyMode = 'adaptive',
  isCalibrated = false,
}) => {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return null;
  }

  const confidencePct = poseResult?.confidence
    ? Math.round(poseResult.confidence * 100)
    : 0;

  return (
    <View style={styles.overlay}>
      <Text style={styles.header}>DEBUG OVERLAY (DEV ONLY)</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Camera Status:</Text>
        <Text style={styles.value}>{cameraStatus}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Live FPS:</Text>
        <Text style={[styles.value, metrics.fps < 20 ? styles.warn : styles.good]}>
          {metrics.fps} FPS
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Latency:</Text>
        <Text style={styles.value}>{metrics.latencyMs} ms</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Catalog:</Text>
        <Text style={styles.value}>JSON Ready (99)</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Quality State:</Text>
        <Text
          style={[
            styles.value,
            qualityState === 'good'
              ? styles.good
              : qualityState === 'acceptable'
              ? styles.info
              : styles.warn,
          ]}
        >
          {qualityState.toUpperCase()}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Difficulty:</Text>
        <Text style={styles.value}>{difficultyMode.toUpperCase()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Calibration:</Text>
        <Text style={styles.value}>{isCalibrated ? 'v1 OK' : 'Default'}</Text>
      </View>
      {deviceFormatText ? (
        <View style={styles.row}>
          <Text style={styles.label}>Format:</Text>
          <Text style={styles.value}>{deviceFormatText}</Text>
        </View>
      ) : null}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>Pose Detected:</Text>
        <Text style={[styles.value, poseResult?.detected ? styles.good : styles.warn]}>
          {poseResult?.detected ? 'YES' : 'NO'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Landmarks:</Text>
        <Text style={styles.value}>{poseResult?.landmarkCount ?? 0}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Pose Confidence:</Text>
        <Text style={styles.value}>{confidencePct}%</Text>
      </View>
      {activityResult ? (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Goal:</Text>
            <Text style={styles.value}>{activityResult.activityType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>State:</Text>
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
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: spacing.md,
    borderRadius: radius.md,
    zIndex: 999,
    minWidth: 195,
  },
  header: {
    fontFamily: typography.families.rounded,
    fontSize: 10,
    color: '#FFD700',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: spacing.xs,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    color: '#A0A0A0',
    marginRight: spacing.sm,
  },
  value: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: 'bold',
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
