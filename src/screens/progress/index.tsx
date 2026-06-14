import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { colors, typography, spacing } from '../../theme';
import { useNavigation } from '@react-navigation/native';

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ScreenContainer>
      <TopBar title="My Progress" showBack />
      <View style={styles.content}>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Detailed Progress Placeholder</Text>
          <Text style={styles.subtitle}>Check how many words you have learned and review your growth chart!</Text>
        </AppCard>
        <AppButton label="Go Back" onPress={() => navigation.goBack()} style={styles.button} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  button: {
    width: '100%',
    maxWidth: 200,
  },
});

export default ProgressScreen;
