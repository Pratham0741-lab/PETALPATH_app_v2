/**
 * NavigationGuide
 *
 * Orchestrator that composes TutorialBubble + AudioGuideButton + HandPointer + GlowTarget
 * for a given screen. Handles first-time audio, inactivity recovery for the hand pointer,
 * and screen-specific tutorial configurations.
 *
 * Audio plays ONCE per screen visit.
 * Hand pointer reappears after 10s inactivity (up to 3 times).
 *
 * Usage:
 *   <NavigationGuide
 *     screenKey="home"
 *     guideKey="welcome"
 *     message="Let's continue our adventure!"
 *     handMode="tap"
 *     handX={200}
 *     handY={400}
 *   />
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTutorialStore } from '../../store/tutorialStore';
import { AudioGuideButton } from './AudioGuideButton';
import { TutorialBubble } from './TutorialBubble';
import { HandPointer } from './HandPointer';

interface NavigationGuideProps {
  /** Unique screen identifier for first-time tracking */
  screenKey: string;
  /** Audio guide key to play */
  guideKey: 'welcome' | 'roadmap' | 'video' | 'listen' | 'speak' | 'write' | 'reward' | 'lesson_complete' | 'great_job' | 'try_again';
  /** Message to show in tutorial bubble */
  message: string;
  /** Position of the tutorial bubble */
  bubblePosition?: 'top' | 'bottom';
  /** Whether to show the bubble at all */
  showBubble?: boolean;

  // Hand pointer props
  /** Enable hand pointer animation */
  showHand?: boolean;
  /** Hand animation mode */
  handMode?: 'tap' | 'bounce' | 'move';
  /** Hand X position (center) */
  handX?: number;
  /** Hand Y position (top) */
  handY?: number;
  /** Move mode: start X */
  handStartX?: number;
  /** Move mode: start Y */
  handStartY?: number;
  /** Move mode: end X */
  handEndX?: number;
  /** Move mode: end Y */
  handEndY?: number;
  /** Hand size override */
  handSize?: number;
}

const INACTIVITY_TIMEOUT_MS = 10_000;
const MAX_INACTIVITY_RETRIES = 3;

export const NavigationGuide: React.FC<NavigationGuideProps> = ({
  screenKey,
  guideKey,
  message,
  bubblePosition = 'bottom',
  showBubble = true,
  showHand = false,
  handMode = 'tap',
  handX = 0,
  handY = 0,
  handStartX,
  handStartY,
  handEndX,
  handEndY,
  handSize = 70,
}) => {
  const {
    enabled,
    isPlaying,
    hasSeen,
    playTutorial,
    markSeen,
    animationsEnabled,
    interactionTimestamp,
  } = useTutorialStore();

  const hasPlayedAudioRef = useRef(false);
  const [showingBubble, setShowingBubble] = React.useState(false);
  const [handVisible, setHandVisible] = React.useState(false);

  // Inactivity recovery for hand pointer
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityCountRef = useRef(0);
  const interactedRef = useRef(false);

  // Clear inactivity timer on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // Start inactivity monitoring for hand pointer
  const startInactivityWatch = useCallback(() => {
    if (!showHand || !animationsEnabled || !enabled) return;
    if (inactivityCountRef.current >= MAX_INACTIVITY_RETRIES) return;

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      if (!interactedRef.current && inactivityCountRef.current < MAX_INACTIVITY_RETRIES) {
        inactivityCountRef.current += 1;
        setHandVisible(true);
        setShowingBubble(true);

        // Hide bubble after 5 seconds
        setTimeout(() => {
          setShowingBubble(false);
        }, 5000);

        // Schedule next inactivity check
        startInactivityWatch();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [showHand, animationsEnabled, enabled]);

  // Record user interaction — hide hand, reset inactivity
  useEffect(() => {
    if (interactionTimestamp > 0) {
      interactedRef.current = true;
      setHandVisible(false);
      inactivityCountRef.current = 0;

      // Reset for next inactivity cycle
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Don't restart inactivity — user has interacted
      const timeout = setTimeout(() => {
        interactedRef.current = false;
        startInactivityWatch();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [interactionTimestamp, startInactivityWatch]);

  // Effect 1: Play audio guide ONCE per screen visit (first time only)
  useEffect(() => {
    if (!enabled || hasPlayedAudioRef.current) return;

    const alreadySeen = hasSeen(screenKey);
    if (alreadySeen) return;

    hasPlayedAudioRef.current = true;

    // Small delay to let screen render
    const timeout = setTimeout(() => {
      setShowingBubble(true);

      playTutorial(guideKey as any, () => {
        // Audio finished callback
        setTimeout(() => {
          setShowingBubble(false);
          markSeen(screenKey);
        }, 2000);
      });
    }, 800);

    return () => clearTimeout(timeout);
  }, [enabled, screenKey, guideKey, playTutorial, markSeen, hasSeen]);

  // Effect 2: Manage hand pointer visibility and auto-hide/inactivity watch
  useEffect(() => {
    if (!enabled || !showHand || !animationsEnabled) {
      setHandVisible(false);
      return;
    }

    // Determine delay: longer if playing first-time audio
    const alreadySeen = hasSeen(screenKey);

    // Safety check: home screen guide hand pointer should only be shown on first visit
    if (screenKey === 'home' && alreadySeen) {
      setHandVisible(false);
      return;
    }

    const delay = alreadySeen ? 1200 : 2000; // wait for audio intro if first time

    const showTimeout = setTimeout(() => {
      setHandVisible(true);
      startInactivityWatch();

      // Auto-hide hand after 8 seconds of active display
      const hideTimeout = setTimeout(() => {
        setHandVisible(false);
      }, 8000);

      return () => clearTimeout(hideTimeout);
    }, delay);

    return () => {
      clearTimeout(showTimeout);
    };
  }, [enabled, showHand, animationsEnabled, screenKey, startInactivityWatch, hasSeen]);

  // Show bubble while audio is playing
  useEffect(() => {
    if (isPlaying && enabled) {
      setShowingBubble(true);
    }
  }, [isPlaying]);

  // Hide bubble when audio stops (for manual replays)
  useEffect(() => {
    if (!isPlaying && showingBubble) {
      const timeout = setTimeout(() => setShowingBubble(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isPlaying]);

  return (
    <>
      {showBubble && (
        <View style={styles.bubbleContainer}>
          <TutorialBubble
            message={message}
            visible={showingBubble}
            position={bubblePosition}
          />
        </View>
      )}

      {showHand && (
        <HandPointer
          visible={handVisible}
          x={handX}
          y={handY}
          mode={handMode}
          startX={handStartX}
          startY={handStartY}
          endX={handEndX}
          endY={handEndY}
          size={handSize}
          delay={200}
        />
      )}

      <AudioGuideButton />
    </>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 300,
  },
});
