import type { TextStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ColorScheme = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  border: string;
  borderLight: string;
  divider: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
  overlay: string;
  shadow: string;
  transparent: string;
  white: string;
  black: string;
  skeleton: string;
  skeletonHighlight: string;
};

export type ExtendedColorScheme = {
  light: ColorScheme;
  dark: ColorScheme;
};

export type Spacing = {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  huge: number;
  4: number;
  8: number;
  12: number;
  16: number;
  20: number;
  24: number;
  32: number;
  40: number;
  48: number;
  64: number;
};

export type Radius = {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  full: number;
  progress: number;
  input: number;
  chip: number;
  button: number;
  card: number;
  bottomNav: number;
  illustrationCard: number;
};

export type Typography = {
  families: {
    rounded: string;
  };
  sizes: {
    caption: number;
    small: number;
    body: number;
    cardTitle: number;
    sectionTitle: number;
    largeTitle: number;
    display: number;
    button: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
    huge: number;
  };
  weights: {
    regular: TextStyle['fontWeight'];
    medium: TextStyle['fontWeight'];
    bold: TextStyle['fontWeight'];
    black: TextStyle['fontWeight'];
  };
  lineHeights: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
};

export type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type Shadows = {
  sm: Shadow;
  md: Shadow;
  lg: Shadow;
  xl: Shadow;
};

export type Animation = {
  durations: {
    fast: number;
    normal: number;
    slow: number;
  };
  easings: {
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
};

export type Breakpoints = {
  mobileMax: number;
  tabletMax: number;
};

export type ElevationLevel = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type Elevation = {
  1: ElevationLevel;
  2: ElevationLevel;
  3: ElevationLevel;
  4: ElevationLevel;
  5: ElevationLevel;
};

export type IconSizes = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type AvatarSizes = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type IllustrationSizes = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
};
