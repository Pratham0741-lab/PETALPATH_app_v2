import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { colors as tokens } from '../../theme/colors';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

/**
 * The heading block on every signed-out screen (sign in, register, reset).
 *
 * Two changes from the original: the brand is the real logo rather than a
 * flower emoji beside the word, and the title/subtitle sit on the same
 * translucent panel the rest of the app uses — the auth screens now have the
 * garden-gate wallpaper behind them, and plain text on that artwork was hard to
 * read.
 */
export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.container} accessibilityRole="header">
      {showLogo ? (
        <Image
          source={require('../../assets/brand/petalpath-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="PetalPath"
        />
      ) : null}

      <View style={styles.panel}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            accessibilityRole="text"
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 132,
    height: 132,
    marginBottom: spacing.md,
  },
  panel: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: tokens.surfaceTranslucent,
    borderWidth: 1,
    borderColor: tokens.borderLight,
    borderRadius: radius.card,
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
