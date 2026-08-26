/**
 * Draggable Token View — PetalPath Drag & Drop Presentation
 * PanResponder gesture handling with canvas scale compensation, dynamic scaling, and token rendering.
 *
 * Redesign notes: the gesture pipeline is untouched — `gesture.dx / scaleFactor`
 * still converts screen pixels into virtual canvas units, and every callback
 * fires with the same arguments as before. What changed is the paint: the token
 * palette is the app's six accent colours instead of a Tailwind grab-bag (spec
 * §3), a locked token now carries a visible ring as well as reduced opacity so
 * "already placed" does not depend on a 10% opacity shift (§30), and the drop
 * shadow uses the shared elevation token.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Animated, PanResponder, StyleSheet, Text } from 'react-native';
import { colors, radius, shadows, typography } from '../../../theme';
import { DraggableItem, DropZone as DropZoneModel } from '../types';
import { AccessibilityService } from '../../../core/accessibility/accessibilityService';
import { useCanvasScale } from './Canvas';

export interface DraggableProps {
  item: DraggableItem;
  isLocked: boolean;
  isHighlighted?: boolean;
  placedDropZone?: DropZoneModel;
  onDragStart: (id: string, x: number, y: number) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, dropPoint: { x: number; y: number }) => boolean;
}

/**
 * Fallback token colours, cycled by `sortOrder`, for specs that ship no explicit
 * `style.backgroundColor`. Generated specs always set one, so this is a safety net.
 *
 * These are measured, not assumed. The previous list used `colors.orange`,
 * `colors.leafGreen` and `colors.coral`, above a comment asserting all six were
 * "dark enough for white text" — they measure 2.48:1, 2.83:1 and 2.72:1 against
 * white, all below even the 3:1 large-text bar (§30). Every hue below clears 3:1,
 * and none of them is the green or red that `DropZone` uses for its verdicts.
 */
const palette = [
  '#E8386A', // rose   4.03:1
  '#3F7FC4', // blue   4.16:1
  '#D9741F', // amber  3.25:1
  '#7B5BD6', // purple 4.87:1
  '#2E8C9E', // teal   3.92:1
  '#8A6242', // cocoa  5.38:1
];

export const Draggable: React.FC<DraggableProps> = ({
  item,
  isLocked,
  isHighlighted,
  placedDropZone,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const { scale: canvasScale } = useCanvasScale();
  const scaleFactor = canvasScale > 0 ? canvasScale : 1;

  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Determine current origin position (either default position or placed drop zone center)
  const currentPosX = placedDropZone
    ? placedDropZone.shape.position.x + (placedDropZone.shape.dimensions.width - item.dimensions.width) / 2
    : item.position.x;

  const currentPosY = placedDropZone
    ? placedDropZone.shape.position.y + (placedDropZone.shape.dimensions.height - item.dimensions.height) / 2
    : item.position.y;

  // Reset pan value when position changes
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [currentPosX, currentPosY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isLocked && item.behavior.draggable,
        onMoveShouldSetPanResponder: () => !isLocked && item.behavior.draggable,
        onPanResponderGrant: (evt) => {
          pan.setOffset({ x: 0, y: 0 });
          pan.setValue({ x: 0, y: 0 });
          Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true }).start();
          onDragStart(item.id, evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        },
        onPanResponderMove: (evt, gesture) => {
          const virtDx = gesture.dx / scaleFactor;
          const virtDy = gesture.dy / scaleFactor;
          pan.setValue({ x: virtDx, y: virtDy });
          onDragMove(item.id, currentPosX + virtDx, currentPosY + virtDy);
        },
        onPanResponderRelease: (evt, gesture) => {
          const virtDx = gesture.dx / scaleFactor;
          const virtDy = gesture.dy / scaleFactor;

          const dropPointX = currentPosX + virtDx + item.dimensions.width / 2;
          const dropPointY = currentPosY + virtDy + item.dimensions.height / 2;

          pan.flattenOffset();
          Animated.spring(scaleAnim, { toValue: 1.0, useNativeDriver: true }).start();

          const wasPlaced = onDragEnd(item.id, { x: dropPointX, y: dropPointY });

          if (!wasPlaced) {
            // Smooth return to origin
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(scaleAnim, { toValue: 1.0, useNativeDriver: true }).start();
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        },
      }),
    [item.id, isLocked, item.behavior.draggable, currentPosX, currentPosY, scaleFactor, onDragStart, onDragMove, onDragEnd]
  );

  const rawSrLabel = item.accessibility?.screenReaderLabel ?? '';

  const displayLabel = AccessibilityService.getScreenReaderLabel(
    rawSrLabel,
    item.content || 'Draggable Item'
  );

  /*
   * What the child actually sees. Only `content` is real display text; the
   * screen-reader label is a last resort and is suppressed when it is an `l10n:`
   * key, because `getScreenReaderLabel` "humanises" such a key by taking its last
   * colon-segment — so `l10n:drag:pn_matching:item-1:sr-label` came out as the
   * literal words "sr label", drawn at 56px inside the tile. 24 of the shipped
   * boards rendered exactly that. A bare coloured tile is a smaller lie than a
   * tile captioned with the name of an accessibility field; the spoken label
   * below is unaffected either way.
   */
  const visibleText = item.content || (rawSrLabel.startsWith('l10n:') ? '' : displayLabel);

  const bgColor = item.style?.backgroundColor || palette[item.sortOrder % palette.length];

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.token,
        {
          position: 'absolute',
          left: currentPosX,
          top: currentPosY,
          width: item.dimensions.width,
          height: item.dimensions.height,
          backgroundColor: bgColor,
          borderRadius: item.style?.borderRadius || radius.illustrationCard,
          transform: [...pan.getTranslateTransform(), { scale: scaleAnim }],
        },
        isLocked && styles.lockedToken,
        isHighlighted && styles.highlightedToken,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Draggable: ${displayLabel}`}
      accessibilityState={{ disabled: isLocked }}
      accessibilityHint={isLocked ? 'Already placed' : 'Drag this onto its matching shape'}
    >
      {visibleText ? (
        <Text
          style={[
            styles.text,
            {
              color: item.style?.textColor || colors.white,
              fontSize: item.style?.fontSize || 56,
              fontWeight: (item.style?.fontWeight as any) || typography.weights.black,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {visibleText}
        </Text>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  token: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    ...shadows.md,
    elevation: 6,
  },
  lockedToken: {
    opacity: 0.9,
    /* A ring, not just an opacity nudge, so "placed" is legible on its own (§30). */
    borderWidth: 3,
    borderColor: colors.leafGreen,
  },
  highlightedToken: {
    borderWidth: 3,
    borderColor: colors.warning,
  },
  text: {
    fontSize: 56,
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.black,
    color: colors.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
