import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { colors as tokens } from '../../theme/colors';

interface AuthFooterLink {
  label: string;
  onPress: () => void;
}

interface AuthFooterProps {
  links: AuthFooterLink[];
}

export const AuthFooter: React.FC<AuthFooterProps> = ({ links }) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.container}>
      {links.map((link, index) => (
        <TouchableOpacity
          key={index}
          onPress={link.onPress}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          accessibilityHint={`Navigates to ${link.label}`}
          style={styles.linkTouchable}
        >
          <Text
            style={[styles.linkText, { color: colors.textLink }]}
          >
            {link.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    /* Panelled like the heading block: these links sit on the garden-gate
       wallpaper, and underlined text alone was hard to pick out on the art. */
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: tokens.surfaceTranslucent,
    borderWidth: 1,
    borderColor: tokens.borderLight,
    borderRadius: radius.card,
  },
  linkTouchable: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  linkText: {
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

export default AuthFooter;
