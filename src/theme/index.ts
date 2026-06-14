import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { animations } from './animations';
import { breakpoints } from './breakpoints';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  animations,
  breakpoints,
};

export type Theme = typeof theme;
export { colors, typography, spacing, radius, shadows, animations, breakpoints };
