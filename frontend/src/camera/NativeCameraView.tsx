import React from 'react';
import { requireNativeComponent, StyleSheet, View, Text, Platform, UIManager } from 'react-native';

let PetalPathNativeCameraView: any = null;
if (Platform.OS === 'android') {
  try {
    const hasConfig = typeof (UIManager as any).getViewManagerConfig === 'function'
      ? !!(UIManager as any).getViewManagerConfig('PetalPathNativeCameraView')
      : !!(UIManager as any).PetalPathNativeCameraView;

    if (hasConfig) {
      PetalPathNativeCameraView = requireNativeComponent<any>('PetalPathNativeCameraView');
    }
  } catch (error) {
    console.warn('[NativeCameraView] Native view component not registered:', error);
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
