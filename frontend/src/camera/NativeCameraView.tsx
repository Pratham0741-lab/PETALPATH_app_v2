import React from 'react';
import { requireNativeComponent, StyleSheet, View, Text, Platform, UIManager } from 'react-native';

const hasNativeCameraViewManager = Platform.OS === 'android' && (
  typeof UIManager.hasViewManagerConfig === 'function'
    ? UIManager.hasViewManagerConfig('PetalPathNativeCameraView')
    : !!(UIManager as any).getViewManagerConfig?.('PetalPathNativeCameraView') || !!(UIManager as any).PetalPathNativeCameraView
);

let PetalPathNativeCameraView: any = null;
if (hasNativeCameraViewManager) {
  try {
    PetalPathNativeCameraView = requireNativeComponent<any>('PetalPathNativeCameraView');
  } catch (error) {
    console.warn('[NativeCameraView] Native view component resolution failed:', error);
  }
}

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
