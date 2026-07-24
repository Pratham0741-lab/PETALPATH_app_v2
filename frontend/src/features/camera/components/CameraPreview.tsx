import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  ReadonlyFrameProcessor,
} from 'react-native-vision-camera';

interface CameraPreviewProps {
  isActive: boolean;
  frameProcessor?: ReadonlyFrameProcessor;
  onDeviceFormatReady?: (formatDescription: string) => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  isActive,
  frameProcessor,
  onDeviceFormatReady,
}) => {
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { fps: 30 },
    { videoResolution: { width: 1280, height: 720 } },
  ]);

  React.useEffect(() => {
    if (format && onDeviceFormatReady) {
      const fps = format.maxFps ?? 30;
      const res = `${format.videoWidth}x${format.videoHeight}`;
      onDeviceFormatReady(`${res} @ ${fps}FPS`);
    }
  }, [format, onDeviceFormatReady]);

  if (!device) {
    return null;
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
});
