/**
 * Empty state component
 *
 * Generic placeholder shown when a list or section has no data.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🌱',
  title = 'Nothing here yet',
  message = 'Once there is something to show, it will appear here.',
}) => {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
