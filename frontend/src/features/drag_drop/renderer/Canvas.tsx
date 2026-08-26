/**
 * Responsive Canvas Container — PetalPath Drag & Drop Presentation
 * Scales virtual canvas coordinates (e.g. 1000x750) responsively to device viewport.
 *
 * Redesign notes (spec §5, §27):
 *  - The fit is measured from this container, not from `useWindowDimensions()`.
 *    The play area sits below a header, so sizing against the whole window made
 *    the scaled canvas taller than the space it had and the bottom rows were
 *    silently clipped by `overflow: hidden`. Window dimensions are still the
 *    fallback for the very first frame, before `onLayout` has fired.
 *  - The board now reads as a card: warm surface, hairline border, 22px radius.
 *    Both are divided by `scale` because the whole board is scaled down — a
 *    literal `borderWidth: 1` would render at a third of a pixel.
 *  - `scale` itself is still `canvasWidth / config.width`, and it is still the
 *    only thing published on the context, so `Draggable`'s gesture maths is
 *    untouched.
 */

import React, { createContext, useContext, useState } from 'react';
import { LayoutChangeEvent, View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, radius } from '../../../theme';
import { CanvasConfig } from '../types';

interface CanvasContextType {
  scale: number;
}

const CanvasContext = createContext<CanvasContextType>({ scale: 1 });

export const useCanvasScale = () => useContext(CanvasContext);

export interface CanvasProps {
  config: CanvasConfig;
  children: React.ReactNode;
}

export const Canvas: React.FC<CanvasProps> = ({ config, children }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    // Only re-render on a real change, or every layout pass re-triggers one.
    if (box && Math.abs(box.width - width) < 1 && Math.abs(box.height - height) < 1) return;
    setBox({ width, height });
  };

  const availableWidth = box?.width ?? windowWidth;
  const availableHeight = box?.height ?? windowHeight;

  const targetRatio = config.width / config.height;
  const currentRatio = availableWidth / availableHeight;

  let canvasWidth = availableWidth;
  let canvasHeight = availableHeight;

  if (currentRatio > targetRatio) {
    canvasWidth = availableHeight * targetRatio;
  } else {
    canvasHeight = availableWidth / targetRatio;
  }

  const scale = canvasWidth / config.width;
  /* Guard the division: a zero scale would make the frame infinitely thick. */
  const inverse = scale > 0 ? 1 / scale : 1;

  return (
    <CanvasContext.Provider value={{ scale }}>
      <View style={styles.outerContainer} onLayout={handleLayout}>
        <View
          style={[
            styles.canvas,
            {
              width: config.width,
              height: config.height,
              transform: [{ scale }],
              borderWidth: inverse,
              borderRadius: radius.card * inverse,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </CanvasContext.Provider>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    /* Transparent so the shell's warm background shows through the letterbox
       margins on either side of the board. */
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  canvas: {
    position: 'relative',
    /* No `backgroundColor` here on purpose. `Background` is the first child and
       paints the scene edge to edge; an opaque `colors.surface` fill on the
       frame itself sat *above* nothing but still forced the board to be white
       before the scene drew, which flashed on mount. The frame contributes only
       its border and its clip. */
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
