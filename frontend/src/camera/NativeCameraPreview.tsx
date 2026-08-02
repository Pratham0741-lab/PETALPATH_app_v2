import React from 'react';
import { requireNativeComponent, ViewProps, StyleSheet, View } from 'react-native';

interface NativeCameraPreviewProps extends ViewProps {}

const NativeCameraPreviewComponent = requireNativeComponent<NativeCameraPreviewProps>('NativeCameraPreview');

export const NativeCameraPreview: React.FC<NativeCameraPreviewProps> = (props) => {
  return <NativeCameraPreviewComponent {...props} style={[styles.preview, props.style]} />;
};

const styles = StyleSheet.create({
  preview: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default NativeCameraPreview;
