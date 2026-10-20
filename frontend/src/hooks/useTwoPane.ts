import { useWindowDimensions } from 'react-native';
import { useDeviceType } from './useDeviceType';
import { useSidebarWidth } from '../components/navigation/sidebarLayout';

/**
 * Width a screen needs before it splits into two panes. Below this a second
 * column would squeeze both to phone width and gain nothing; above it, one
 * centred column leaves most of a landscape tablet empty.
 */
const TWO_PANE_MIN_CONTENT = 880;

/**
 * Whether the screen should lay out as two side-by-side panes.
 *
 * Measured from the content area, not the window: on tablets the sidebar takes
 * its share first. A 10" tablet in landscape (~1280dp) splits; the same tablet
 * in portrait (~800dp) stays one column, and phones never split.
 */
export function useTwoPane(): boolean {
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const rail = useSidebarWidth(deviceType);
  if (deviceType === 'mobile') return false;
  return width - rail >= TWO_PANE_MIN_CONTENT;
}
