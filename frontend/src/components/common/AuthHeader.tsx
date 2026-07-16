import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
    >
      {showLogo ? (
        <Text
          style={[styles.logo, { color: colors.primary }]}
          accessibilityLabel="PetalPath Logo"
          accessibilityRole="text"
        >
          🌸 PetalPath
        </Text>
      ) : null}
      <Text
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[styles.subtitle, { color: colors.textSecondary }]}
          accessibilityRole="text"
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AuthHeader;
