/**
 * Drag & Drop Master Renderer — PetalPath Presentation Module
 * Coordinates Canvas, Background, Draggables, DropZones, HintOverlay, CelebrationOverlay,
 * AccessibilityOverlay, and CompletionModal.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DragDropEngine } from '../engine/DragDropEngine';
import { DragDropActivitySpec, ProgressiveHint } from '../types';
import { Canvas } from './Canvas';
import { Background } from './Background';
import { Draggable } from './Draggable';
import { DropZoneView } from './DropZone';
import { HintOverlay } from './HintOverlay';
import { CelebrationOverlay } from './CelebrationOverlay';
import { AccessibilityOverlay } from '../../../core/ui/AccessibilityOverlay';
import { useTheme } from '../../../theme/ThemeContext';

export interface DragDropRendererProps {
  activityId?: string;
  initialSpec?: DragDropActivitySpec;
  onExit: () => void;
  onNext?: () => void;
}

export const DragDropRenderer: React.FC<DragDropRendererProps> = ({
  activityId,
  initialSpec,
  onExit,
  onNext,
}) => {
  const { theme } = useTheme();
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading Activity...</Text>
      </View>
    );
  }

  if (error || !spec) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.errorText}>{error || 'Could not load activity.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onExit}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {spec.metadata?.title && !spec.metadata.title.startsWith('l10n:')
            ? spec.metadata.title
            : 'Match the Following'}
        </Text>
      </View>

      {/* Accessibility Controls Overlay */}
      <AccessibilityOverlay instruction={spec.metadata?.description} />

      {/* Canvas & Interactive Content */}
      <Canvas config={spec.canvas}>
        <Background backgroundColor="#F1F5F9" />

        {/* Drop Zones */}
        {spec.dropZones.map((zone) => (
          <DropZoneView
            key={zone.id}
            zone={zone}
            placedDraggableId={placements[zone.id]}
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
        <HintOverlay activeHint={activeHint} />

        {/* Celebration Particle Overlay */}
        <CelebrationOverlay showConfetti={showConfetti} />
      </Canvas>

      {/* Bottom Inline Completion Bar */}
      {isCompleted && (
        <View style={styles.completionBar}>
          <View style={styles.starsRow}>
            {[1, 2, 3].map((starIndex) => (
              <Ionicons
                key={starIndex}
                name={starIndex <= finalStars ? 'star' : 'star-outline'}
                size={34}
                color={starIndex <= finalStars ? '#FFD700' : '#CBD5E1'}
                style={{ marginHorizontal: 4 }}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={onNext || onExit}
            activeOpacity={0.8}
            accessibilityLabel="Continue to next activity"
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  completionBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 100,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueBtn: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 50,
  },
  exitBtn: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
