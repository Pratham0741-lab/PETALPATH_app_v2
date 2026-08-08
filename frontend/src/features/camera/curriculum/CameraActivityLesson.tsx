import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useCameraLifecycle } from '../hooks/useCameraLifecycle';
import { useFrameProcessorPipeline } from '../hooks/useFrameProcessorPipeline';
import { useActivitySession } from '../session/useActivitySession';
import { getDefaultCurriculumConfig, getActivityDefinition } from '../session/activityDefinitions';
import { CameraPreview } from '../components/CameraPreview';
import { CameraPermissionState } from '../components/CameraPermissionState';
import { DebugOverlay } from '../components/DebugOverlay';
import { ActivityTimerRing } from '../components/ActivityTimerRing';
import { RepetitionCounter } from '../components/RepetitionCounter';
import { ChildFeedbackOverlay } from '../feedback/ChildFeedbackOverlay';
import { useFeedbackVoice } from '../feedback/useFeedbackVoice';
import { cameraSyncService } from '../progress/cameraSyncService';
import { cameraAnalytics } from '../analytics/cameraAnalytics';
import { offlineQueue } from '../progress/offlineQueue';
import { ActivityType } from '../types/pose.types';
import { colors, spacing, radius, typography } from '../../../theme';

export const CameraActivityLesson: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const lessonId = route.params?.lessonId || 'les_camera_demo';
  const activityId = route.params?.activityId || 'act_camera_demo';
  const activityType: ActivityType = route.params?.activityType || 'raise_hands';

  const config = getDefaultCurriculumConfig(lessonId, activityId, activityType);
  const technicalDef = getActivityDefinition(activityType);

  const { hasPermission, permissionStatus, requestPermission } = useCameraPermissions();
  const { isActive } = useCameraLifecycle();
  const {
    frameProcessor,
    debugMetrics,
    poseResult,
    activityResult,
    setActiveActivity,
  } = useFrameProcessorPipeline();

  const {
    snapshot,
    sessionState,
    startSession,
    processFrameResult,
    resetSession,
  } = useActivitySession(activityType);

  const { speakInstruction } = useFeedbackVoice();
  const [queueCount, setQueueCount] = useState<number>(0);
  const [deviceFormatText, setDeviceFormatText] = useState<string>('');

  useEffect(() => {
    setActiveActivity(activityType);
  }, [activityType, setActiveActivity]);

  useEffect(() => {
    if (permissionStatus === 'not-determined') {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  useEffect(() => {
    if (hasPermission && isActive && sessionState === 'idle') {
      startSession(activityType, 3);
      speakInstruction(config.instruction);
      cameraAnalytics.logEvent('activity_started', { lessonId, activityId, activityType });
    }
  }, [hasPermission, isActive, sessionState, startSession, activityType, config.instruction, speakInstruction, lessonId, activityId]);

  useEffect(() => {
    if (sessionState === 'running') {
      processFrameResult(activityResult);
    }
  }, [activityResult, sessionState, processFrameResult]);

  useEffect(() => {
    if (sessionState === 'completed') {
      cameraSyncService
        .handleActivityCompletion(lessonId, activityId, activityType, 1500)
        .then(() => {
          offlineQueue.getQueue().then((q) => setQueueCount(q.length));
        });
    }
  }, [sessionState, lessonId, activityId, activityType]);

  const handleDeviceFormatReady = useCallback((formatText: string) => {
    setDeviceFormatText(formatText);
  }, []);

  const handleRestart = () => {
    resetSession();
    startSession(activityType, 3);
  };

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title={config.title} showBack />

      <View style={styles.previewContainer}>
        {hasPermission && isActive ? (
          <>
            <CameraPreview
              isActive={isActive}
              frameProcessor={frameProcessor}
              onDeviceFormatReady={handleDeviceFormatReady}
            />

            {/* Instruction Header */}
            <View style={styles.instructionCard}>
              <Text style={styles.instructionText}>{config.instruction}</Text>
            </View>

            {/* Timer Ring & Countdown */}
            <View style={styles.centerHUD}>
              {sessionState === 'starting' ? (
                <ActivityTimerRing
                  progressMs={0}
                  targetMs={technicalDef.holdDurationMs}
                  countdownSec={snapshot.countdownSec}
                  isStarting
                />
              ) : sessionState === 'running' ? (
                <>
                  <ActivityTimerRing
                    progressMs={snapshot.holdProgressMs}
                    targetMs={technicalDef.holdDurationMs}
                  />
                  <RepetitionCounter
                    currentReps={snapshot.currentReps}
                    targetReps={snapshot.targetReps}
                  />
                </>
              ) : null}
            </View>

            {/* Session State Overlays */}
            {sessionState === 'completed' ? (
              <View style={styles.completionCard}>
                <Text style={styles.completionEmoji}>🎉</Text>
                <Text style={styles.completionTitle}>Activity Completed!</Text>
                <Text style={styles.completionSubtitle}>
                  +{config.reward.stars} Stars • +{config.reward.xp} XP Earned
                </Text>
                <Pressable
                  style={styles.continueButton}
                  onPress={() => navigation.canGoBack() && navigation.goBack()}
                >
                  <Text style={styles.continueButtonText}>Continue Learning</Text>
                </Pressable>
              </View>
            ) : sessionState === 'timed_out' ? (
              <View style={styles.completionCard}>
                <Text style={styles.completionEmoji}>⏳</Text>
                <Text style={styles.completionTitle}>Time Up!</Text>
                <Text style={styles.completionSubtitle}>Take a breath and try again whenever you are ready!</Text>
                <Pressable style={styles.continueButton} onPress={handleRestart}>
                  <Text style={styles.continueButtonText}>Try Again</Text>
                </Pressable>
              </View>
            ) : (
              <ChildFeedbackOverlay
                message={activityResult.feedback}
                category={
                  activityResult.state === 'completed'
                    ? 'completion'
                    : activityResult.state === 'detected'
                    ? 'success'
                    : 'encouragement'
                }
              />
            )}

            {/* Dev Debug Overlay with Queue Status */}
            <DebugOverlay
              metrics={debugMetrics}
              cameraStatus={hasPermission ? 'ready' : 'loading'}
              deviceFormatText={deviceFormatText}
              poseResult={poseResult}
              activityResult={activityResult}
            />
          </>
        ) : (
          <CameraPermissionState
            status={permissionStatus === 'denied' ? 'permission_denied' : 'loading'}
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
  instructionCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: 210,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    zIndex: 10,
  },
  instructionText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  centerHUD: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  completionCard: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 200,
  },
  completionEmoji: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  completionTitle: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xxl,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  completionSubtitle: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  continueButton: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
  },
  continueButtonText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: colors.card,
    fontWeight: 'bold',
  },
});

export default CameraActivityLesson;
