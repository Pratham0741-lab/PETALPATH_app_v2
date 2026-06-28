import { TextStyle, Platform } from 'react-native';

export const typography = {
  families: {
    rounded: Platform.select({
      ios: 'System',
      android: 'sans-serif-rounded',
      web: 'Nunito, Baloo 2, system-ui, -apple-system, sans-serif',
      default: 'System',
    }),
  },
  sizes: {
    caption: 12,
    small: 14,
    body: 16,
    cardTitle: 20,
    sectionTitle: 24,
    largeTitle: 34,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 34,
    huge: 48,
  },
  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    black: '900' as TextStyle['fontWeight'],
  },
  lineHeights: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 28,
    xxl: 32,
    xxxl: 40,
  },
};
