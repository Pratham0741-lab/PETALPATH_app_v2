import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/radius';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
