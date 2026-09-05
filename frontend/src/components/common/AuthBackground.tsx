import React from 'react';
import { View, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/radius';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

/**
 * The backdrop for every signed-out screen (sign in, register, password reset).
 *
 * Carries the garden-gate scene so the entry flow looks like the rest of the app
 * rather than a plain form on a flat colour. Sized and stretched exactly as
 * `AppShell` does its wallpapers — explicit pixel width/height, never
 * `absoluteFill`, so the image can't be stretched by whatever the parent happens
 * to measure — and drawn behind the children, which stay transparent on top.
 */
export const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { width, height } = useWindowDimensions();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={SCREEN_BACKGROUNDS.login}
        resizeMode="stretch"
        style={{ position: 'absolute', top: 0, left: 0, width, height }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeElement: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
});

export default AuthBackground;
