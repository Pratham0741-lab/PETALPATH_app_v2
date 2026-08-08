/**
 * Draggable Token View — PetalPath Drag & Drop Presentation
 * PanResponder gesture handling with canvas scale compensation, dynamic scaling, and token rendering.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Animated, PanResponder, StyleSheet, Text } from 'react-native';
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

const palette = ['#4A90E2', '#8B5CF6', '#0EA5E9', '#F59E0B', '#EC4899', '#10B981'];

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

  const displayLabel = AccessibilityService.getScreenReaderLabel(
    item.accessibility.screenReaderLabel,
    item.content || 'Draggable Item'
  );

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
          borderRadius: item.style?.borderRadius || 24,
          transform: [...pan.getTranslateTransform(), { scale: scaleAnim }],
        },
        isLocked && styles.lockedToken,
        isHighlighted && styles.highlightedToken,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Draggable: ${displayLabel}`}
    >
      {item.content ? (
        <Text
          style={[
            styles.text,
            {
              color: item.style?.textColor || '#FFFFFF',
              fontSize: item.style?.fontSize || 56,
              fontWeight: (item.style?.fontWeight as any) || '800',
            },
          ]}
        >
          {item.content}
        </Text>
      ) : (
        <Text style={styles.text}>{displayLabel}</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  token: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  lockedToken: {
    opacity: 0.9,
  },
  highlightedToken: {
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  text: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
