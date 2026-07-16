import { lightColors, darkColors, colors } from './colors';
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
};
export type LightTheme = typeof lightTheme;
export type DarkTheme = typeof darkTheme;

export {
  lightColors,
  darkColors,
  colors,
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
};
