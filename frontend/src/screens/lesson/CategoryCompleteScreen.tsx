import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { colors, typography, spacing, radius } from '../../theme';
import { useRoute } from '@react-navigation/native';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useChildStore } from '../../store/childStore';

export const CategoryCompleteScreen: React.FC = () => {
  const { navigateToTab } = useAppNavigation();
  const route = useRoute<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  
  const { categoryTitle, badgeName } = route.params || {};

  const handleContinue = () => {
    navigateToTab('Journey');
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="trophy" size={96} color={colors.yellow} />
        </View>

        <Text style={styles.title}>Category Completed!</Text>
        <Text style={styles.subtitle}>
          Spectacular achievement, {activeChild?.name}! You completed the entire "{categoryTitle || 'Category'}" curriculum path!
        </Text>

        {badgeName ? (
          <View style={styles.badgeCard}>
            <View style={styles.badgeIcon}>
              <Ionicons name="medal" size={32} color={colors.purple} />
            </View>
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeLabel}>New Badge Earned!</Text>
              <Text style={styles.badgeName}>{badgeName}</Text>
            </View>
          </View>
        ) : null}

        <AppButton
          label="View Rewards"
          onPress={() => navigateToTab('Rewards')}
          style={styles.rewardsButton}
          variant="secondary"
        />

        <AppButton
          label="Go to Map"
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
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.yellow + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 32,
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
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.purple + '10',
    borderWidth: 1,
    borderColor: colors.purple + '20',
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: '100%',
    marginBottom: spacing.lg,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInfo: {
    flex: 1,
    gap: 4,
  },
  badgeLabel: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  badgeName: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  rewardsButton: {
    width: '100%',
    height: 54,
    borderRadius: radius.xl,
    marginBottom: spacing.xs,
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: radius.xl,
  },
});

export default CategoryCompleteScreen;
