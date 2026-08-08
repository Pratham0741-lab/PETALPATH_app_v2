/**
 * Responsive Canvas Container — PetalPath Drag & Drop Presentation
 * Scales virtual canvas coordinates (e.g. 1000x750) responsively to device viewport.
 */

import React, { createContext, useContext } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
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

  const targetRatio = config.width / config.height;
  const currentRatio = windowWidth / windowHeight;

  let canvasWidth = windowWidth;
  let canvasHeight = windowHeight;

  if (currentRatio > targetRatio) {
    canvasWidth = windowHeight * targetRatio;
  } else {
    canvasHeight = windowWidth / targetRatio;
  }

  const scale = canvasWidth / config.width;

  return (
    <CanvasContext.Provider value={{ scale }}>
      <View style={styles.outerContainer}>
        <View
          style={[
            styles.canvas,
            {
              width: config.width,
              height: config.height,
              transform: [{ scale }],
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
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  canvas: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
