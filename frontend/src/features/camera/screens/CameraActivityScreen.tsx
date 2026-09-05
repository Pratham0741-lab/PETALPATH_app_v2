/**
 * Pose Activity Engine — the live engine screen (spec §34 phase 7).
 *
 * Every line of pipeline wiring is the original (§1, §23): the same
 * `useCameraPermissions` / `useCameraLifecycle` / `useCameraEnginePipeline`
 * hooks, the same `cameraStatus` ladder, the same `NativeCameraView` filling the
 * preview, the same always-on `DebugOverlay` — this is the diagnostic surface, so
 * its readouts stay exactly as they are — the same `__DEV__` gate around the
 * activity selector, and the same `setActiveActivity(id, label)` call that gives
 * the engine a human name for its feedback.
 *
 * The chrome around it is now the design system:
 *
 *  - `ScreenContainer` + `TopBar` → `AppShell` + `PageHeader`, so this screen has
 *    the app's background, safe areas and back affordance rather than its own.
 *  - "🔄 Flip Camera" — an emoji doing an icon's job (§7) in a translucent black
 *    box — is a labelled `SecondaryButton` below the preview. That also retires
 *    `right: 210`, a magic offset that existed only to keep the dev chips from
 *    sliding under the old floating button (§27, §33). It spent one revision as a
 *    bare `IconButton` in the header, which was a mistake: an unlabelled glyph
 *    beside the back chevron reads as chrome, and the flip control effectively
 *    disappeared. Dropping the emoji is a restyle; dropping the *label* was a
 *    functional regression.
 *  - The chip row is the shared `SegmentedTabs` in its scrolling layout, the same
 *    switcher Camera Activities and My Rewards use (§28), and it now sits above
 *    the preview instead of on it — `DebugOverlay` covers the top of the camera
 *    image at z-index 9999, so chips floating there were unreachable.
 *  - The three-state banner is the shared `ChildFeedbackOverlay`, so the engine
 *    screen and the child-facing lesson speak in one visual language instead of
 *    two: `completed` → the completion tone, `detected` → success, anything else
 *    → neutral coaching.
 *
 * The preview keeps a black fill and gains the app's card radius: black is what a
 * camera surface honestly looks like before frames arrive, not decoration.
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppShell, PageHeader, SecondaryButton, SegmentedTabs } from '../../../components/design';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useCameraLifecycle } from '../hooks/useCameraLifecycle';
import { useCameraEnginePipeline } from '../../../camera/hooks/useCameraEnginePipeline';
import { NativeCameraView } from '../../../camera/NativeCameraView';
import { DebugOverlay } from '../../../camera/DebugOverlay';
import { CameraPermissionState } from '../components/CameraPermissionState';
import { ChildFeedbackOverlay } from '../feedback/ChildFeedbackOverlay';
import { CameraStatus } from '../types/camera.types';
import { ActivityType } from '../types/pose.types';
import { colors, radius, spacing } from '../../../theme';
import { SCREEN_BACKGROUNDS } from '../../../assets/backgrounds';

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

const SELECTOR_ITEMS = MVP_ACTIVITIES.map((act) => ({ key: act.id, label: act.label }));

export const CameraActivityScreen: React.FC = () => {
  const { hasPermission, permissionStatus, requestPermission } = useCameraPermissions();
  const { isActive } = useCameraLifecycle();
  const {
    activityResult,
    activeActivity,
    setActiveActivity,
    switchCamera,
  } = useCameraEnginePipeline();

  useEffect(() => {
    if (permissionStatus === 'not-determined') {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  let cameraStatus: CameraStatus = 'loading';
  if (permissionStatus === 'denied') {
    cameraStatus = 'permission_denied';
  } else if (permissionStatus === 'not-determined') {
    cameraStatus = 'requesting_permission';
  } else if (hasPermission) {
    cameraStatus = isActive ? 'ready' : 'loading';
  }

  const live = hasPermission && isActive;

  /* `SegmentedTabs` reports the key; the engine also wants the readable name it
     shows in its feedback, so it is looked up here rather than duplicated. */
  const handleSelectActivity = useCallback(
    (id: ActivityType) => {
      const chosen = MVP_ACTIVITIES.find((act) => act.id === id);
      setActiveActivity(id, chosen?.label);
    },
    [setActiveActivity],
  );

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.camera}
      scroll={false}
     
      header={
        <PageHeader
          title="Pose Activity Engine"
          subtitle="Live preview with engine diagnostics"
        />
      }
    >
      <View style={styles.body}>
        {/* The selector sits above the preview rather than on it: `DebugOverlay`
            owns the top of the camera image at z-index 9999, and chips hidden
            behind a metrics panel are chips nobody can press. */}
        {live && typeof __DEV__ !== 'undefined' && __DEV__ ? (
          <SegmentedTabs
            items={SELECTOR_ITEMS}
            selected={activeActivity}
            onSelect={handleSelectActivity}
            layout="scroll"
            accessibilityLabel="Pose to practice"
          />
        ) : null}

        <View style={styles.preview}>
          {live ? (
            <>
              <NativeCameraView style={StyleSheet.absoluteFill} />
              {/* The diagnostic readout this screen exists for — always on. */}
              <DebugOverlay isVisible={true} />

              <ChildFeedbackOverlay
                message={activityResult.feedback}
                category={
                  activityResult.state === 'detected' ? 'success' : 'encouragement'
                }
                isCompleted={activityResult.state === 'completed'}
              />
            </>
          ) : (
            <CameraPermissionState
              status={cameraStatus}
              onRequestPermission={requestPermission}
            />
          )}
        </View>

        {/* ---------------------------------------------------- Camera control */}
        {/* Labelled, below the preview, for the same reason as the child-facing
            lesson: in the header it was a bare glyph beside the back chevron and
            nobody could find it. Here it also cannot collide with the always-on
            `DebugOverlay` that owns the top of the image (§33). */}
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
    /* Honest for a camera surface, and the app's own card radius around it. */
    backgroundColor: colors.black,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});

export default CameraActivityScreen;
