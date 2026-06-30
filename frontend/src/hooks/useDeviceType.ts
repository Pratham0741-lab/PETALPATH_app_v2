import { useWindowDimensions } from 'react-native';
import { breakpoints } from '../theme/breakpoints';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const useDeviceType = (): DeviceType => {
  const { width, height } = useWindowDimensions();

  // Use the shortest dimension to classify the DEVICE (orientation-independent).
  // This matches Android's sw600dp concept:
  //   - Phone shortest side: ~360-414dp → always mobile
  //   - Tablet shortest side: ~600-800dp → always tablet
  //   - Desktop/large window: both sides ≥ 1024dp → desktop
  const shortestSide = Math.min(width, height);

  if (shortestSide < breakpoints.mobileMax) {
    return 'mobile';
  } else if (shortestSide < breakpoints.tabletMax) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};