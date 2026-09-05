/**
 * Drag & Drop Master Renderer — PetalPath Presentation Module
 * Coordinates Canvas, Background, Draggables, DropZones, HintOverlay,
 * CelebrationOverlay and AccessibilityOverlay.
 *
 * (The original header also listed `CompletionModal`; nothing has ever imported
 * that file, and completion is handled by the footer bar below.)
 *
 * Match & Learn — reference screen 9 (spec §34 phase 5).
 *
 * The engine side of this file is deliberately unchanged (§1): the same
 * `DragDropEngine` instance, the same `loadAndPrepare` / `startActivity`
 * sequence, the same three event-bus subscriptions with the same 1500ms delay
 * between confetti and the completion bar, and the same three drag handlers
 * passing the same arguments. `PlacementManager`, `ValidationSystem`,
 * `ScoringSystem` and `StarRatingEvaluator` are never touched from here.
 *
 * The chrome is what the redesign replaces:
 *  - The 56px hand-rolled header bar becomes `ActivityHeader kind="match"`, so
 *    Match wears its orange identity (§15) and the same back control as the
 *    other four activities. Its progress readout is the activity's real
 *    position in the lesson via `getActivityPosition`, not a guess (§33).
 *  - The instruction, which previously existed only as a screen-reader label on
 *    an invisible overlay, is now also shown. A child who cannot read it aloud
 *    still needs to know the task.
 *  - The floating completion bar — absolutely positioned at `bottom: 24` with
 *    its own shadow, radius and purple button — becomes `AppShell`'s sticky
 *    footer with a real `StarRating` and `PrimaryButton` (§28, §33).
 *  - Loading and error states use the shared `ErrorState` and the same
 *    centred-spinner pattern as Listen, Speak, Watch and Trace.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../theme';
import { DragDropEngine } from '../engine/DragDropEngine';
import { DragDropActivitySpec, ProgressiveHint } from '../types';
import { Canvas } from './Canvas';
import { Background } from './Background';
import { Draggable } from './Draggable';
import { DropZoneView } from './DropZone';
import { HintOverlay } from './HintOverlay';
import { CelebrationOverlay } from './CelebrationOverlay';
import { AccessibilityOverlay } from '../../../core/ui/AccessibilityOverlay';
import { AccessibilityService } from '../../../core/accessibility/accessibilityService';
import { ErrorState } from '../../../components/common/ErrorState';
import { getActivityPosition } from '../../../utils/navigationFlow';
import { PetalMark } from '../../../components/brand/PetalMark';
import { SCREEN_BACKGROUNDS } from '../../../assets/backgrounds';
import {
  ActivityHeader,
  AppShell,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StarRating,
} from '../../../components/design';

export interface DragDropRendererProps {
  activityId?: string;
  initialSpec?: DragDropActivitySpec;
  onExit: () => void;
  onNext?: () => void;
}

const FALLBACK_TITLE = 'Match the Following';
const FALLBACK_INSTRUCTION = 'Drag each piece onto the shape it matches.';

export const DragDropRenderer: React.FC<DragDropRendererProps> = ({
  activityId,
  initialSpec,
  onExit,
  onNext,
}) => {
  const engineRef = useRef(new DragDropEngine());
  const engine = engineRef.current;

  const [spec, setSpec] = useState<DragDropActivitySpec | null>(initialSpec || null);
  const [loading, setLoading] = useState(!initialSpec);
  const [error, setError] = useState<string | null>(null);

  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [activeHint, setActiveHint] = useState<ProgressiveHint | { type: 'idle'; hintType: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(100);
  const [finalStars, setFinalStars] = useState(3);

  // Load activity
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (initialSpec) {
        engine.setSpec(initialSpec);
        engine.startActivity();
        setLoading(false);
        return;
      }

      if (!activityId) {
        setError('No activity ID provided');
        setLoading(false);
        return;
      }

      try {
        const loadedSpec = await engine.loadAndPrepare(activityId);
        if (isMounted) {
          setSpec(loadedSpec);
          engine.startActivity();
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load activity');
          setLoading(false);
        }
      }
    }

    init();

    // Subscribe to event bus for reactive UI updates
    const unsubs = [
      engine.eventBus.on('ITEM_PLACED', () => {
        if (isMounted) {
          setPlacements(engine.placementState.getAllPlacements());
        }
      }),
      engine.eventBus.on('HINT_TRIGGERED', (event) => {
        if (isMounted && event.payload?.hint) {
          setActiveHint(event.payload.hint);
        }
      }),
      engine.eventBus.on('ACTIVITY_COMPLETED', (event) => {
        if (isMounted) {
          setShowConfetti(true);
          setFinalScore(event.payload.score || 100);
          setFinalStars(event.payload.stars || 3);
          setTimeout(() => {
            if (isMounted) setIsCompleted(true);
          }, 1500);
        }
      }),
    ];

    return () => {
      isMounted = false;
      unsubs.forEach((unsub) => unsub());
      engine.dispose();
    };
  }, [activityId, initialSpec]);

  const handleDragStart = useCallback(
    (id: string, x: number, y: number) => {
      setActiveHint(null);
      engine.handleDragStart(id, x, y);
    },
    [engine]
  );

  const handleDragMove = useCallback(
    (id: string, x: number, y: number) => {
      engine.handleDragMove(id, x, y);
    },
    [engine]
  );

  const handleDragEnd = useCallback(
    (id: string, dropPoint: { x: number; y: number }): boolean => {
      const isPlaced = engine.handleDragEnd(id, dropPoint);
      setPlacements({ ...engine.placementState.getAllPlacements() });
      return isPlaced;
    },
    [engine]
  );

  /** Real position in the lesson, so the header cannot disagree with "Continue". */
  const position = useMemo(
    () => (activityId ? getActivityPosition(activityId) : null),
    [activityId]
  );

  /*
   * Which zone the hint ring should sit on: the first target still waiting to be
   * filled. `HintOverlay` early-returns unless it is given a `targetPosition`,
   * and this screen never passed one — so `HintController` fired its progressive
   * and idle hints into a component that drew nothing. A child stuck on the board
   * got no help at all, which is the whole point of the hint system.
   */
  const hintTarget = useMemo(() => {
    if (!activeHint || !spec) return undefined;
    const open = spec.dropZones.find((z) => !placements[z.id]);
    if (!open) return undefined;
    return {
      x: open.shape.position.x,
      y: open.shape.position.y,
      width: open.shape.dimensions.width,
      height: open.shape.dimensions.height,
    };
  }, [activeHint, spec, placements]);

  /** Speaks the instruction. Same dynamic-require pattern the camera feedback uses,
   *  so a missing `expo-speech` degrades to the screen-reader announcement. */
  const readInstruction = useCallback((text: string) => {
    AccessibilityService.announceForScreenReader(text);
    try {
      const Speech = require('expo-speech');
      if (Speech && typeof Speech.speak === 'function') {
        Speech.stop();
        Speech.speak(text, { language: 'en-IN', pitch: 1.1, rate: 0.9 });
      }
    } catch {
      // No speech module — the announcement above is the fallback.
    }
  }, []);

  if (loading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.match} scroll={false} header={<PageHeader title="Match & Learn" onBack={onExit} />}>
        <View style={styles.center}>
          <PetalMark size={96} loading />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Setting up the board…
          </Text>
        </View>
      </AppShell>
    );
  }

  if (error || !spec) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.match}
        scroll={false}
        header={<PageHeader title="Match & Learn" onBack={onExit} />}
        footer={<SecondaryButton label="Go Back" icon="back" onPress={onExit} />}
      >
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this activity"
            message={error || 'Could not load activity.'}
          />
        </View>
      </AppShell>
    );
  }

  const title =
    spec.metadata?.title && !spec.metadata.title.startsWith('l10n:')
      ? spec.metadata.title
      : FALLBACK_TITLE;

  /* Humanises an `l10n:` key rather than printing it, and falls back to a real
     sentence when a spec ships with no description at all. */
  const instruction = AccessibilityService.getScreenReaderLabel(
    spec.metadata?.description,
    FALLBACK_INSTRUCTION
  );

  const header = (
    <ActivityHeader
      kind="match"
      kindLabel="Match & Learn"
      title={title}
      onBack={onExit}
      backLabel="Back to lesson"
      steps={position?.total}
      step={position?.index}
      progress={
        position ? ((position.index + (isCompleted ? 1 : 0)) / position.total) * 100 : undefined
      }
      progressLabel={position ? `Activity ${position.index + 1} of ${position.total}` : undefined}
    />
  );

  /*
   * The score moved out of the footer and above the board. Sharing the footer
   * row, the stars sat on the scene with nothing behind them and were hard to
   * make out, and they competed with the one thing the child needs to press.
   * Up here they land where the eye already is after finishing, on a panel that
   * guarantees they read against any part of the artwork.
   */
  const scorePanel = isCompleted ? (
    <View style={styles.scorePanel}>
      <StarRating value={finalStars} max={3} size="md" animate />
    </View>
  ) : null;

  const footer = isCompleted ? (
    <PrimaryButton
      label="Continue"
      iconRight="forward"
      tone="green"
      onPress={onNext || onExit}
      accessibilityHint={`You scored ${finalScore} percent. Moves on to the next activity.`}
    />
  ) : undefined;

  return (
    /* `petals="none"`: the board now paints its own sky-and-meadow scene, and the
       shell's blossom layer showing through the letterbox margins around it
       competed with that rather than framing it. */
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.match} scroll={false} padded={false} header={header} footer={footer}>
      {scorePanel}

      <Text style={[typography.presets.subtle, styles.instruction]} numberOfLines={2}>
        {instruction}
      </Text>

      {/* The play area. The overlay is anchored here rather than to the whole
          screen so its controls never sit on top of the header. */}
      <View style={styles.stage}>
        <AccessibilityOverlay
          instruction={spec.metadata?.description}
          onReadInstruction={() => readInstruction(instruction)}
        />

        <Canvas config={spec.canvas}>
          <Background width={spec.canvas.width} height={spec.canvas.height} />

          {/* Drop Zones */}
          {spec.dropZones.map((zone) => (
            <DropZoneView
              key={zone.id}
              zone={zone}
              placedDraggableId={placements[zone.id]}
              isHighlighted={Boolean(hintTarget) && !placements[zone.id]}
            />
          ))}

          {/* Draggables */}
          {spec.draggables.map((item) => {
            const placedZoneId = Object.keys(placements).find((zoneId) => placements[zoneId] === item.id);
            const placedZone = placedZoneId ? spec.dropZones.find((z) => z.id === placedZoneId) : undefined;

            return (
              <Draggable
                key={item.id}
                item={item}
                isLocked={engine.placementState.isItemLocked(item.id)}
                placedDropZone={placedZone}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            );
          })}

          {/* Hint Visual Overlay */}
          <HintOverlay activeHint={activeHint} targetPosition={hintTarget} />

          {/* Celebration Particle Overlay */}
          <CelebrationOverlay showConfetti={showConfetti} />
        </Canvas>
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  instruction: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  stage: {
    flex: 1,
  },
  /* Same translucent surface as the cards, so the stars read on any scene. */
  scorePanel: {
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceTranslucent,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.card,
  },
});
