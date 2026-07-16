import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const scale = (size: number): number => {
  return (windowWidth / BASE_WIDTH) * size;
};

const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

const verticalScale = (size: number): number => {
  return (windowHeight / BASE_HEIGHT) * size;
};

const responsiveFontSize = (size: number): number => {
  const scaledSize = moderateScale(size, 0.5);
  return PixelRatio.roundToNearestPixel(scaledSize);
};

const isLandscape = (): boolean => {
  return windowWidth > windowHeight;
};

const isPortrait = (): boolean => {
  return windowWidth <= windowHeight;
};

export {
  scale,
  moderateScale,
  verticalScale,
  responsiveFontSize,
  isLandscape,
  isPortrait,
  windowWidth,
  windowHeight,
};
