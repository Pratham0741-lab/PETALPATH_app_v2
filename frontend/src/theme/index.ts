import {
  lightColors,
  darkColors,
  colors,
  activityColors,
  getActivityColor,
} from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { animations } from './animations';
import { breakpoints } from './breakpoints';
import { elevation } from './elevation';
import { iconSizes } from './iconSizes';
import { avatarSizes } from './avatarSizes';
import { illustrationSizes } from './illustrationSizes';
import {
  sizes,
  buttonSizes,
  iconButtonSizes,
  cardSizes,
  headerSizes,
  bottomNavSizes,
  roadmapSizes,
  stepRailSizes,
  progressSizes,
  badgeSizes,
  answerSizes,
  mediaOrbSizes,
  starSizes,
  waveSizes,
  layoutSizes,
  MIN_TOUCH_TARGET,
} from './sizes';

export const lightTheme = {
  colors: lightColors,
  typography,
  spacing,
  radius,
  shadows,
  animations,
  breakpoints,
  elevation,
  iconSizes,
  avatarSizes,
  illustrationSizes,
  sizes,
};

export const darkTheme = {
  colors: darkColors,
  typography,
  spacing,
  radius,
  shadows,
  animations,
  breakpoints,
  elevation,
  iconSizes,
  avatarSizes,
  illustrationSizes,
  sizes,
};

export const theme = lightTheme;

export type Theme = {
  colors: Record<string, string>;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  animations: typeof animations;
  breakpoints: typeof breakpoints;
  elevation: typeof elevation;
  iconSizes: typeof iconSizes;
  avatarSizes: typeof avatarSizes;
  illustrationSizes: typeof illustrationSizes;
  sizes: typeof sizes;
};
export type LightTheme = typeof lightTheme;
export type DarkTheme = typeof darkTheme;

export {
  lightColors,
  darkColors,
  colors,
  activityColors,
  getActivityColor,
  typography,
  spacing,
  radius,
  shadows,
  animations,
  breakpoints,
  elevation,
  iconSizes,
  avatarSizes,
  illustrationSizes,
  sizes,
  buttonSizes,
  iconButtonSizes,
  cardSizes,
  headerSizes,
  bottomNavSizes,
  roadmapSizes,
  stepRailSizes,
  progressSizes,
  badgeSizes,
  answerSizes,
  mediaOrbSizes,
  starSizes,
  waveSizes,
  layoutSizes,
  MIN_TOUCH_TARGET,
};
export type { ActivityColorKey } from './colors';
export type { TextPreset } from './typography';
export type {
  ButtonSizeToken,
  IconButtonSizeToken,
  BadgeSizeToken,
  MediaOrbSizeToken,
  StarSizeToken,
} from './sizes';
