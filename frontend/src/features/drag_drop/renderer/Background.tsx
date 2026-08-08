/**
 * Canvas Background View — PetalPath Drag & Drop Presentation
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export interface BackgroundProps {
  backgroundImageUrl?: string;
  backgroundColor?: string;
}

export const Background: React.FC<BackgroundProps> = ({ backgroundImageUrl, backgroundColor = '#F1F5F9' }) => {
  if (backgroundImageUrl && !backgroundImageUrl.startsWith('petalpath:asset:placeholder:')) {
    return (
      <Image
        source={{ uri: backgroundImageUrl }}
        style={[StyleSheet.absoluteFill, styles.bgImage]}
        resizeMode="cover"
      />
    );
  }

  return <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />;
};

const styles = StyleSheet.create({
  bgImage: {
    width: '100%',
    height: '100%',
  },
});
