import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card, Button } from '../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useRoute } from '@react-navigation/native';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useChildStore } from '../../store/childStore';

export const ModuleCompleteScreen: React.FC = () => {
  const { navigateToTab } = useAppNavigation();
  const route = useRoute<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  
  const { moduleTitle, nextModuleTitle } = route.params || {};

  const handleContinue = () => {
    navigateToTab('Journey');
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="ribbon" size={64} color={colors.yellow} />
        </View>

        <Text style={[styles.title, { fontFamily: typography.families.rounded }]}>Module Completed!</Text>
        <Text style={[styles.subtitle, { fontFamily: typography.families.rounded }]}>
          Amazing work, {activeChild?.name}! You completed the "{moduleTitle || 'Module'}" module!
        </Text>

        {nextModuleTitle ? (
          <Card style={styles.unlockCard}>
            <Ionicons name="lock-open" size={20} color={colors.purple} />
            <Text style={[styles.unlockText, { fontFamily: typography.families.rounded }]}>
              Next Module Unlocked: <Text style={styles.bold}>{nextModuleTitle}</Text>
            </Text>
          </Card>
        ) : null}

        <Button
          label="Continue Journey"
          variant="primary"
          onPress={handleContinue}
          style={styles.button}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(247, 201, 75, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(247, 201, 75, 0.3)',
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  unlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: 'rgba(139, 120, 216, 0.25)',
    borderWidth: 1.5,
    padding: spacing.md,
    width: '100%',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 120, 216, 0.08)',
  },
  unlockText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
  },
  bold: {
    fontWeight: typography.weights.bold,
    color: colors.purple,
  },
  button: {
    width: '100%',
    height: 54,
  },
});

export default ModuleCompleteScreen;
