import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

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
