/**
 * A camera activity, played (spec §34 phase 7).
 *
 * This is the screen the pose engine actually runs in, so every effect, hook and
 * service call is the original (§1, §23): `setActiveActivity(activityType,
 * config.title)` — the wiring that makes the engine speak the activity's real
 * name rather than "raise hands" — the permission request, the
 * start-session-on-active effect with its voice instruction and
 * `activity_started` analytics, the frame pump into `processFrameResult`, the
 * completion sync with its swallowed 404s, `handleRestart`, and the always-on
 * `DebugOverlay`.
 *
 * The chrome is now the design system:
 *
 *  - `ScreenContainer` + `TopBar` → `AppShell` + `PageHeader`, and "🔄 Flip
 *    Camera" (§7) is a labelled `SecondaryButton` with a real icon, sitting below
 *    the preview. It spent one revision as a bare `IconButton` in the header,
 *    which was a mistake: an unlabelled glyph beside the back chevron reads as
 *    chrome, and the flip control effectively disappeared.
 *  - The instruction moved off the camera image and into the flow above it. It
 *    used to float at `top: spacing.md` with `right: 210` — a magic offset that
 *    existed only to dodge that floating flip button (§27, §33) — and it was
 *    losing anyway: `DebugOverlay` owns the top of the preview at z-index 9999,
 *    so the one line telling a child what to do sat *behind* a metrics panel.
 *    In the flow it is always legible, and nothing has to be measured against
 *    anything.
 *  - The completion and time-up cards were separately-styled boxes with their own
 *    shadows and their own 🎉 and ⏳; they are `Card`s with `IconWell` glyphs and
 *    the shared buttons now (§5, §7, §28).
 *  - "+3 Stars • +10 XP" is `RewardBadge`, the same pills the rest of the app
 *    counts rewards with.
 *
 * Two things that were latent in the old file and are now real:
 *
 *  - `queueCount` was fetched after every completion and never shown — the value
 *    existed, nothing used it. When the sync queue is not empty the completion
 *    card now says so, because "your stars are saved on this device and will sync
 *    later" is worth telling a child who finished an activity offline.
 *  - Eight `poseButton*` styles belonged to a manual "I did the pose" button that
 *    no longer exists in the JSX. They are gone; nothing rendered them.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  AppShell,
  Card,
  IconWell,
  PageHeader,
  PrimaryButton,
  RewardBadge,
  SecondaryButton,
} from '../../../components/design';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useCameraLifecycle } from '../hooks/useCameraLifecycle';
import { useCameraEnginePipeline } from '../../../camera/hooks/useCameraEnginePipeline';
import { NativeCameraView } from '../../../camera/NativeCameraView';
import { DebugOverlay } from '../../../camera/DebugOverlay';
import { useActivitySession } from '../session/useActivitySession';
import { getDefaultCurriculumConfig, getActivityDefinition } from '../session/activityDefinitions';
import { CameraPermissionState } from '../components/CameraPermissionState';
import { ActivityTimerRing } from '../components/ActivityTimerRing';
import { RepetitionCounter } from '../components/RepetitionCounter';
import { ChildFeedbackOverlay } from '../feedback/ChildFeedbackOverlay';
import { useFeedbackVoice } from '../feedback/useFeedbackVoice';
import { cameraSyncService } from '../progress/cameraSyncService';
import { cameraAnalytics } from '../analytics/cameraAnalytics';
import { offlineQueue } from '../progress/offlineQueue';
import { ActivityType } from '../types/pose.types';
import { cardSizes, colors, radius, spacing, typography } from '../../../theme';
import { SCREEN_BACKGROUNDS } from '../../../assets/backgrounds';

export const CameraActivityLesson: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const lessonId = route.params?.lessonId || 'les_camera_demo';
  const activityId = route.params?.activityId || 'act_camera_demo';
  const activityType: ActivityType = route.params?.activityType || 'raise_hands';

  const config = getDefaultCurriculumConfig(lessonId, activityId, activityType);
  const technicalDef = getActivityDefinition(activityType, activityId);

  /**
   * The primitive that decides success.
   *
   * The route may carry the catalog's own `validatorName`; when it does not, the
   * catalog entry for `activityId` supplies it. Either way this is what stops the
   * activity being validated as one of eight generic poses — the Explorer used to
   * flatten all 97 activities into `raise_hands` or `touch_head`, so 95 of them
   * checked whether the child had raised their hands regardless of what the card
   * had asked for.
   */
  const validatorName: string | undefined = route.params?.validatorName || config.validatorName;

  const { hasPermission, permissionStatus, requestPermission } = useCameraPermissions();
  const { isActive } = useCameraLifecycle();
  const {
    activityResult,
    setActiveActivity,
    switchCamera,
  } = useCameraEnginePipeline();

  const {
    snapshot,
    sessionState,
    startSession,
    processFrameResult,
    resetSession,
  } = useActivitySession(activityType, activityId);

  const { speakInstruction } = useFeedbackVoice();
  const [queueCount, setQueueCount] = useState<number>(0);

  useEffect(() => {
    setActiveActivity(activityType, config.title, validatorName);
  }, [activityType, config.title, validatorName, setActiveActivity]);

  useEffect(() => {
    if (permissionStatus === 'not-determined') {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  useEffect(() => {
    if (isActive && sessionState === 'idle') {
      startSession(activityType, 0, activityId);
      speakInstruction(config.instruction);
      cameraAnalytics.logEvent('activity_started', { lessonId, activityId, activityType });
    }
  }, [isActive, sessionState, startSession, activityType, config.instruction, speakInstruction, lessonId, activityId]);

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
        })
        .catch(() => {
          // Gracefully handle 404 / network errors
        });
    }
  }, [sessionState, lessonId, activityId, activityType]);

  const handleRestart = () => {
    resetSession();
    startSession(activityType, 3, activityId);
  };

  const live = hasPermission && isActive;

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.camera}
      scroll={false}
     
      header={<PageHeader title={config.title} />}
    >
      <View style={styles.body}>
        {/* ---------------------------------------------------- Instruction */}
        {/* In the flow above the preview, not floating on it: the always-on
            `DebugOverlay` owns the top of the camera image at z-index 9999, and
            a child's instruction must never end up behind a metrics panel. */}
        {live ? (
          <Card variant="raised" padding="compact" accent={colors.blue} rail>
            <Text style={[typography.presets.cardTitle, styles.instructionText]}>
              {config.instruction}
            </Text>
          </Card>
        ) : null}

        <View style={styles.preview}>
        {live ? (
          <>
            <NativeCameraView style={StyleSheet.absoluteFill} />

            {/* -------------------------------------------------- Centre HUD */}
            {/* Purely informational, so it never intercepts a tap. */}
            <View style={styles.centreHud} pointerEvents="none">
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

            {/* ---------------------------------------------- Session result */}
            {sessionState === 'completed' ? (
              <View style={styles.resultWrap} accessibilityLiveRegion="polite">
                <Card variant="raised" padding="roomy" accent={colors.green} contentStyle={styles.result}>
                  <IconWell
                    icon="trophy"
                    color={colors.green}
                    soft={colors.greenSoft}
                    size={cardSizes.iconWellLarge}
                    filled
                  />
                  <Text style={[typography.presets.title, styles.resultTitle]} accessibilityRole="header">
                    Activity Completed!
                  </Text>

                  <View style={styles.rewardRow}>
                    <RewardBadge kind="stars" value={config.reward.stars} signed showUnit />
                    <RewardBadge kind="xp" value={config.reward.xp} signed showUnit />
                  </View>

                  {/* Was fetched and thrown away before — worth saying out loud. */}
                  {queueCount > 0 ? (
                    <Text style={[typography.presets.caption, styles.resultNote]}>
                      Saved on this device — {queueCount} to sync when you are back online.
                    </Text>
                  ) : null}

                  <PrimaryButton
                    label="Continue Learning"
                    iconRight="forward"
                    size="lg"
                    onPress={() => navigation.canGoBack() && navigation.goBack()}
                    style={styles.resultButton}
                  />
                </Card>
              </View>
            ) : sessionState === 'timed_out' ? (
              <View style={styles.resultWrap} accessibilityLiveRegion="polite">
                <Card variant="raised" padding="roomy" accent={colors.orange} contentStyle={styles.result}>
                  <IconWell
                    icon="clock"
                    color={colors.orange}
                    soft={colors.warningLight}
                    size={cardSizes.iconWellLarge}
                  />
                  <Text style={[typography.presets.title, styles.resultTitle]} accessibilityRole="header">
                    Time Up!
                  </Text>
                  <Text style={[typography.presets.body, styles.resultNote]}>
                    Take a breath and try again whenever you are ready!
                  </Text>

                  <PrimaryButton
                    label="Try Again"
                    icon="replay"
                    size="lg"
                    onPress={handleRestart}
                    style={styles.resultButton}
                  />
                </Card>
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

            {/* Phase 3 diagnostics — the surface the camera bug was traced on. */}
            <DebugOverlay isVisible={true} />
          </>
        ) : (
          <CameraPermissionState
            status={hasPermission ? 'ready' : 'permission_denied'}
            onRequestPermission={requestPermission}
          />
        )}
        </View>

        {/* ------------------------------------------------------ Camera control */}
        {/* A labelled button, not an icon in the header. It began as a "🔄 Flip
            Camera" pill floating on the preview; moving it into the header as a
            bare glyph next to the back chevron made it unfindable — a child (or
            an adult) looking for the flip control could not see one. Below the
            preview it is self-describing, it cannot collide with `DebugOverlay`,
            and it is the only control that does this job (§33). */}
        {live ? (
          <SecondaryButton
            label="Flip Camera"
            icon="flipCamera"
            tone="blue"
            onPress={switchCamera}
            accessibilityHint="Switches between the front and rear camera"
          />
        ) : null}
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.md,
  },
  preview: {
    flex: 1,
    position: 'relative',
    /* Honest for a camera surface, with the app's card radius around it. */
    backgroundColor: colors.black,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  instructionText: {
    color: colors.text,
  },
  centreHud: {
    /* Centred in whatever room the preview has, rather than a fixed
       percentage that could land under the diagnostics panel (§27). */
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    zIndex: 10,
  },
  resultWrap: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 200,
  },
  result: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultTitle: {
    textAlign: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  resultNote: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultButton: {
    marginTop: spacing.sm,
  },
});

export default CameraActivityLesson;
