import { useWindowDimensions } from 'react-native';
import { breakpoints } from '../theme/breakpoints';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const useDeviceType = (): DeviceType => {
  const { width } = useWindowDimensions();

  if (width < breakpoints.mobileMax) {
    return 'mobile';
  } else if (width < breakpoints.tabletMax) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};
