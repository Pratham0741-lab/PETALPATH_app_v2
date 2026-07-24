import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useCameraLifecycle } from '../hooks/useCameraLifecycle';
import { useFrameProcessorPipeline } from '../hooks/useFrameProcessorPipeline';
import { CameraPreview } from '../components/CameraPreview';
import { CameraPermissionState } from '../components/CameraPermissionState';
import { DebugOverlay } from '../components/DebugOverlay';
import { CameraStatus } from '../types/camera.types';
import { ActivityType } from '../types/pose.types';
import { colors, spacing, radius, typography } from '../../../theme';

const MVP_ACTIVITIES: Array<{ id: ActivityType; label: string }> = [
  { id: 'raise_hands', label: 'Raise Hands' },
  { id: 'touch_head', label: 'Touch Head' },
  { id: 'touch_knees', label: 'Touch Knees' },
  { id: 'hands_on_hips', label: 'Hands on Hips' },
  { id: 'hug_yourself', label: 'Hug Yourself (Exp)' },
  { id: 'wave', label: 'Wave' },
  { id: 'clap', label: 'Clap' },
  { id: 'jump', label: 'Jump' },
];

export const CameraActivityScreen: React.FC = () => {
  const { hasPermission, permissionStatus, requestPermission } = useCameraPermissions();
  const { isActive } = useCameraLifecycle();
  const {
    frameProcessor,
    debugMetrics,
    poseResult,
    activityResult,
    activeActivity,
    setActiveActivity,
  } = useFrameProcessorPipeline();
  const [deviceFormatText, setDeviceFormatText] = useState<string>('');

  useEffect(() => {
    if (permissionStatus === 'not-determined') {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  const handleDeviceFormatReady = useCallback((formatText: string) => {
    setDeviceFormatText(formatText);
  }, []);

  let cameraStatus: CameraStatus = 'loading';
  if (permissionStatus === 'denied') {
    cameraStatus = 'permission_denied';
  } else if (permissionStatus === 'not-determined') {
    cameraStatus = 'requesting_permission';
  } else if (hasPermission) {
    cameraStatus = isActive ? 'ready' : 'loading';
  }

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Pose Activity Engine" showBack />
      <View style={styles.previewContainer}>
        {hasPermission && isActive ? (
          <>
            <CameraPreview
              isActive={isActive}
              frameProcessor={frameProcessor}
              onDeviceFormatReady={handleDeviceFormatReady}
            />

            {/* Development-Only Activity Selector Controls */}
            {typeof __DEV__ !== 'undefined' && __DEV__ ? (
              <View style={styles.devSelectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                  {MVP_ACTIVITIES.map((act) => {
                    const isSelected = activeActivity === act.id;
                    return (
                      <Pressable
                        key={act.id}
                        onPress={() => setActiveActivity(act.id)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {act.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Live Activity Feedback Banner */}
            <View
              style={[
                styles.feedbackBanner,
                activityResult.state === 'completed'
                  ? styles.bannerCompleted
                  : activityResult.state === 'detected'
                  ? styles.bannerDetected
                  : styles.bannerSearching,
              ]}
            >
              <Text style={styles.feedbackText}>{activityResult.feedback}</Text>
            </View>

            <DebugOverlay
              metrics={debugMetrics}
              cameraStatus={cameraStatus}
              deviceFormatText={deviceFormatText}
              poseResult={poseResult}
              activityResult={activityResult}
            />
          </>
        ) : (
          <CameraPermissionState
            status={cameraStatus}
            onRequestPermission={requestPermission}
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  devSelectorContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: 210,
    zIndex: 10,
  },
  scrollContent: {
    paddingRight: spacing.sm,
  },
  chip: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  chipActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  chipText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
  },
  chipTextActive: {
    fontWeight: 'bold',
  },
  feedbackBanner: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bannerSearching: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  bannerDetected: {
    backgroundColor: colors.blue,
  },
  bannerCompleted: {
    backgroundColor: colors.green,
  },
  feedbackText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CameraActivityScreen;
