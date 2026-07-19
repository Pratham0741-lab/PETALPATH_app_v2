import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { nameSchema } from '../../utils/validation';
import { FormInput } from '../../components/forms/FormInput';
import { Button } from '../../components/ui/Button';
import { AuthHeader } from '../../components/common/AuthHeader';
import { AuthBackground } from '../../components/common/AuthBackground';
import { Screen } from '../../components/layout/Screen';
import { useAuthStore } from '../../store/authStore';
import { useChildStore } from '../../store/childStore';
import { apiClient } from '../../services/api/apiClient';
import { storageService, StorageKeys } from '../../services/storage';
import { ApiError } from '../../api/errors';
import { toUserMessage } from '../../api/errors';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import type { ApiResponse } from '../../types/api';

const parentProfileSchema = z.object({
  name: nameSchema,
});

type ParentProfileFormData = z.infer<typeof parentProfileSchema>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ParentProfile'>;

export const ParentProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { colors } = theme;

  const [formError, setFormError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [skipUpdate, setSkipUpdate] = useState(false);

  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const refreshChildren = useChildStore((state) => state.refreshChildren);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ParentProfileFormData>({
    resolver: zodResolver(parentProfileSchema),
    defaultValues: {
      name: user?.name ?? '',
    },
  });

  const handleContinue = useCallback(async () => {
    try {
      await refreshChildren();
    } catch {
      // best-effort
    }
    const childrenList = useChildStore.getState().childrenList;
    if (childrenList.length > 0) {
      navigation.reset({ index: 0, routes: [{ name: 'ChildSelection' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'ChildSelection' }] });
    }
  }, [navigation, refreshChildren]);

  const onSubmit = useCallback(async (data: ParentProfileFormData) => {
    setFormError('');
    setIsUpdating(true);

    try {
      await apiClient.put<ApiResponse<{ user: { id: string; email: string; name: string; role: string } }>>(
        '/auth/update-profile',
        { name: data.name.trim() },
      );

      if (user) {
        await setSession({
          accessToken: useAuthStore.getState().token ?? '',
          refreshToken: useAuthStore.getState().refreshToken ?? '',
          user: { ...user, name: data.name.trim() },
        });
      }

      await handleContinue();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.statusCode === 404) {
        setSkipUpdate(true);
        await handleContinue();
      } else {
        const message = error instanceof ApiError ? error.userMessage : toUserMessage(error);
        setFormError(message);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [user, setSession, handleContinue]);

  const handleSkip = useCallback(async () => {
    await handleContinue();
  }, [handleContinue]);

  const isLoading = isSubmitting || isUpdating;

  return (
    <Screen keyboardAvoid>
      <AuthBackground>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
          >
            <View style={styles.authCardWrapper}>
              <AuthHeader
                title="Your Profile"
                subtitle="Let us know a bit about you!"
                showLogo
              />

              <View
                style={[
                  styles.form,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  shadows.md,
                ]}
              >
                {formError ? (
                  <Text
                    style={[styles.errorText, { color: colors.error }]}
                    accessibilityRole="alert"
                    accessibilityLabel={formError}
                  >
                    {formError}
                  </Text>
                ) : null}

                {skipUpdate ? (
                  <View style={styles.skipBanner}>
                    <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                      Profile update is not available yet. You can update your name later in Settings.
                    </Text>
                  </View>
                ) : null}

                <FormInput
                  name="name"
                  control={control as any}
                  label="Your Name"
                  placeholder="Enter your name"
                  autoCapitalize="words"
                  disabled={isLoading || skipUpdate}
                  returnKeyType="done"
                />

                <View
                  style={[styles.infoCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}
                >
                  <Text style={[styles.infoTitle, { color: colors.text }]}>
                    Welcome to PetalPath!
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Next, you will set up a profile for your child to begin their language learning journey.
                  </Text>
                </View>

                <Button
                  title={isLoading ? 'Saving...' : 'Save & Continue'}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isLoading || skipUpdate}
                  loading={isSubmitting}
                  variant="primary"
                  size="lg"
                  fullWidth
                  accessibilityLabel="Save profile and continue"
                  style={styles.saveBtn}
                />

                <Button
                  title="Skip for now"
                  onPress={handleSkip}
                  disabled={isLoading}
                  variant="ghost"
                  fullWidth
                  accessibilityLabel="Skip profile setup"
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </AuthBackground>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  form: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  skipBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  skipText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  authCardWrapper: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
});

export default ParentProfileScreen;
