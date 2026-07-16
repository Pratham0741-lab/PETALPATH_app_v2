import { Platform, Dimensions, StatusBar } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const isIOS: boolean = Platform.OS === 'ios';
export const isAndroid: boolean = Platform.OS === 'android';
export const isWeb: boolean = Platform.OS === 'web';
export const isNative: boolean = isIOS || isAndroid;
export const osVersion: string = Platform.Version?.toString() ?? '';

const SMALL_DEVICE_BREAKPOINT = 375;
const LARGE_DEVICE_BREAKPOINT = 768;

export const isSmallDevice: boolean = screenWidth < SMALL_DEVICE_BREAKPOINT;
export const isLargeDevice: boolean = screenWidth >= LARGE_DEVICE_BREAKPOINT;

export const deviceType: 'phone' | 'tablet' | 'web' = (() => {
  if (isWeb) return 'web';
  const shortestSide = Math.min(screenWidth, screenHeight);
  if (shortestSide >= 600) return 'tablet';
  return 'phone';
})();

const IPHONE_NOTCH_HEIGHTS: number[] = [44];
const IPHONE_DYNAMIC_ISLAND_HEIGHTS: number[] = [54];
const ANDROID_NOTCH_LOWER_BOUND = 24;

export const hasNotch: boolean = (() => {
  if (isIOS) {
    const statusBarHeight = StatusBar.currentHeight ?? 0;
    return IPHONE_NOTCH_HEIGHTS.includes(statusBarHeight);
  }
  if (isAndroid) {
    const statusBarHeight = StatusBar.currentHeight ?? 0;
    return statusBarHeight >= ANDROID_NOTCH_LOWER_BOUND;
  }
  return false;
})();

export const hasDynamicIsland: boolean = (() => {
  if (!isIOS) return false;
  const statusBarHeight = StatusBar.currentHeight ?? 0;
  return IPHONE_DYNAMIC_ISLAND_HEIGHTS.includes(statusBarHeight);
})();

export { screenWidth, screenHeight };
