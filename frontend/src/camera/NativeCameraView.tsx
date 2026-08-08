import React from 'react';
import { requireNativeComponent, StyleSheet, View, Text, Platform, UIManager } from 'react-native';

const isNativeViewRegistered = (name: string): boolean => {
  if (Platform.OS !== 'android') return false;
  try {
    if (typeof UIManager.hasViewManagerConfig === 'function') {
      return UIManager.hasViewManagerConfig(name);
    }
    if (typeof (UIManager as any).getViewManagerConfig === 'function') {
      return !!(UIManager as any).getViewManagerConfig(name);
    }
    return !!(UIManager as any)[name];
  } catch {
    return false;
  }
};

let cachedNativeComponent: any = null;

interface NativeCameraViewProps {
  style?: any;
}

export const NativeCameraView: React.FC<NativeCameraViewProps> = ({ style }) => {
  if (Platform.OS === 'android') {
    if (!cachedNativeComponent && isNativeViewRegistered('PetalPathNativeCameraView')) {
      try {
        cachedNativeComponent = requireNativeComponent<any>('PetalPathNativeCameraView');
      } catch (error) {
        console.warn('[NativeCameraView] Failed to require native component:', error);
      }
    }

    if (cachedNativeComponent) {
      const Component = cachedNativeComponent;
      return <Component style={[styles.full, style]} />;
    }
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
