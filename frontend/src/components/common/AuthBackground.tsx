import React from 'react';
import { View, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/radius';
import { SCREEN_BACKGROUNDS, backgroundFor } from '../../assets/backgrounds';
import { useDeviceType } from '../../hooks/useDeviceType';
import { coverFrame } from '../../utils/coverFrame';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

/**
 * The backdrop for every signed-out screen (sign in, register, password reset).
 *
 * Carries the garden-gate scene so the entry flow looks like the rest of the app
 * rather than a plain form on a flat colour. Drawn exactly as `AppShell` draws
 * its wallpapers — covered and cropped, never distorted (`coverFrame`) — behind
 * the children, which stay transparent on top.
 */
export const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { width, height } = useWindowDimensions();
  const isMobile = useDeviceType() === 'mobile';
  const scene = backgroundFor(SCREEN_BACKGROUNDS.login, isMobile, width, height);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={scene}
        resizeMode="stretch"
        style={coverFrame(scene, width, height)}
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
    overflow: 'hidden',
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
