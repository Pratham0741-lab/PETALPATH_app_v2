import React from 'react';
import { requireNativeComponent, StyleSheet, View, Text, Platform } from 'react-native';

const PetalPathNativeCameraView = Platform.OS === 'android'
  ? requireNativeComponent<any>('PetalPathNativeCameraView')
  : null;

interface NativeCameraViewProps {
  style?: any;
}

export const NativeCameraView: React.FC<NativeCameraViewProps> = ({ style }) => {
  if (Platform.OS === 'android' && PetalPathNativeCameraView) {
    return <PetalPathNativeCameraView style={[styles.full, style]} />;
  }

  return (
    <View style={[styles.fallback, style]}>
      <Text style={styles.fallbackText}>📷 Camera Preview (iOS / Fallback)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NativeCameraView;
