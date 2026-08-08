/**
 * Drop Zone View — PetalPath Drag & Drop Presentation
 * Drop target with visual states (default, hover, correct, incorrect).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DropZone as DropZoneModel } from '../types';
import { AccessibilityService } from '../../../core/accessibility/accessibilityService';

export interface DropZoneProps {
  zone: DropZoneModel;
  placedDraggableId?: string;
  isHovered?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  isHighlighted?: boolean;
}

export const DropZoneView: React.FC<DropZoneProps> = ({
  zone,
  placedDraggableId,
  isHovered,
  isCorrect,
  isIncorrect,
  isHighlighted,
}) => {
  const rawSymbol = zone.visualState?.targetContent || zone.visualState?.labelText || '';
  const symbol = rawSymbol
    .replace(/Outline for\s*/i, '')
    .replace(/\s*Outline/i, '')
    .trim();

  let borderColor = '#94A3B8';
  let backgroundColor = 'rgba(241, 245, 249, 0.4)';
  let symbolColor = '#94A3B8';

  if (isCorrect || placedDraggableId) {
    borderColor = '#10B981';
    backgroundColor = 'rgba(16, 185, 129, 0.15)';
    symbolColor = '#10B981';
  } else if (isIncorrect) {
    borderColor = '#EF4444';
    backgroundColor = 'rgba(239, 68, 68, 0.15)';
    symbolColor = '#EF4444';
  } else if (isHovered) {
    borderColor = '#3B82F6';
    backgroundColor = 'rgba(59, 130, 246, 0.2)';
    symbolColor = '#3B82F6';
  } else if (isHighlighted) {
    borderColor = '#F59E0B';
    backgroundColor = 'rgba(245, 158, 11, 0.2)';
    symbolColor = '#F59E0B';
  }

  return (
    <View
      style={[
        styles.zone,
        {
          position: 'absolute',
          left: zone.shape.position.x,
          top: zone.shape.position.y,
          width: zone.shape.dimensions.width,
          height: zone.shape.dimensions.height,
          borderColor,
          backgroundColor,
          borderRadius: zone.shape.type === 'circle' ? zone.shape.dimensions.width / 2 : 24,
        },
      ]}
      accessibilityLabel={`Drop Zone: ${symbol || 'Target'}${placedDraggableId ? ', matched' : ''}`}
    >
      {symbol ? (
        <Text
          style={[
            styles.outlineSymbol,
            { color: symbolColor, opacity: isCorrect || placedDraggableId ? 1 : 0.65 },
          ]}
        >
          {symbol}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  zone: {
    borderWidth: 3,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  outlineSymbol: {
    fontSize: 72,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
