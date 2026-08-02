import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';

interface CameraPreviewProps {
  isActive: boolean;
  frameProcessor?: any;
  onDeviceFormatReady?: (formatDescription: string) => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  isActive,
  frameProcessor,
  onDeviceFormatReady,
}) => {
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;

  const format = useCameraFormat(device, [
    { fps: 30 },
    { videoResolution: { width: 1280, height: 720 } },
  ]);

  useEffect(() => {
    if (format && onDeviceFormatReady) {
      const fps = format.maxFps ?? 30;
      const res = `${format.videoWidth}x${format.videoHeight}`;
      onDeviceFormatReady(`${res} @ ${fps}FPS`);
    }
  }, [format, onDeviceFormatReady]);

  if (!device) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>📷 Opening Camera Device...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        format={format}
        fps={format?.maxFps ? Math.min(format.maxFps, 30) : 30}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
        enableFpsGraph={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraPreview;
