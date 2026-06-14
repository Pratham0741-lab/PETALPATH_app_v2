import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { colors, typography, spacing, radius } from '../../theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useChildStore } from '../../store/childStore';

export const ModuleCompleteScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  
  const { moduleTitle, nextModuleTitle } = route.params || {};

  const handleContinue = () => {
    navigation.navigate('MainTabs', { screen: 'Journey' });
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="ribbon" size={80} color={colors.yellow} />
        </View>

        <Text style={styles.title}>Module Completed!</Text>
        <Text style={styles.subtitle}>
          Amazing work, {activeChild?.name}! You completed the "{moduleTitle || 'Module'}" module!
        </Text>

        {nextModuleTitle ? (
          <View style={styles.unlockCard}>
            <Ionicons name="lock-open" size={24} color={colors.purple} />
            <Text style={styles.unlockText}>
              Next Module Unlocked: <Text style={styles.bold}>{nextModuleTitle}</Text>
            </Text>
          </View>
        ) : null}

        <AppButton
          label="Continue Journey"
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
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.yellow + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  unlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.purple + '10',
    borderWidth: 1,
    borderColor: colors.purple + '20',
    padding: spacing.md,
    borderRadius: radius.md,
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  unlockText: {
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  bold: {
    fontWeight: typography.weights.bold,
    color: colors.purple,
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: radius.xl,
  },
});

export default ModuleCompleteScreen;
