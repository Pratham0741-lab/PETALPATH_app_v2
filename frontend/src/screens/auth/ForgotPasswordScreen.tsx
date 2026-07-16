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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { emailSchema } from '../../utils/validation';
import { FormInput } from '../../components/forms/FormInput';
import { Button } from '../../components/ui/Button';
import { AuthHeader } from '../../components/common/AuthHeader';
import { AuthFooter } from '../../components/common/AuthFooter';
import { AuthBackground } from '../../components/common/AuthBackground';
import { Screen } from '../../components/layout/Screen';
import { apiClient } from '../../services/api/apiClient';
import { ApiError } from '../../api/errors';
import { toUserMessage } from '../../api/errors';
import type { AuthStackParamList } from '../../types/navigation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import type { ApiResponse } from '../../types/api';

const forgotPasswordFormSchema = z.object({ email: emailSchema });
type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { colors } = theme;

  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = useCallback(async (data: ForgotPasswordFormData) => {
    setFormError('');
    setIsRateLimited(false);

    try {
      await apiClient.post<ApiResponse<null>>('/auth/forgot-password', {
        email: data.email.trim(),
      });
      setIsSuccess(true);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.statusCode === 429) {
        setIsRateLimited(true);
        setFormError('Too many requests. Please wait a moment and try again.');
      } else {
        const message = error instanceof ApiError ? error.userMessage : toUserMessage(error);
        setFormError(message);
      }
    }
  }, []);

  const isLoading = isSubmitting;

  return (
    <Screen scroll keyboardAvoid padded>
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
            <AuthHeader
              title="Forgot Password?"
              subtitle="No worries! Enter your email to reset your password."
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

              {isRateLimited ? (
                <View style={[styles.rateLimitBanner, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="time-outline" size={20} color={colors.warning} />
                  <Text style={[styles.rateLimitText, { color: colors.text }]}>
                    Please wait before requesting again.
                  </Text>
                </View>
              ) : null}

              {isSuccess ? (
                <View style={styles.successContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={48}
                    color={colors.success}
                    style={styles.successIcon}
                  />
                  <Text
                    style={[styles.successTitle, { color: colors.text }]}
                    accessibilityRole="alert"
                  >
                    Check Your Email
                  </Text>
                  <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
                    Password reset instructions have been sent to your email address.
                  </Text>
                </View>
              ) : (
                <>
                  <FormInput
                    name="email"
                    control={control as any}
                    label="Email Address"
                    placeholder="explorer@petalpath.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    disabled={isLoading}
                    returnKeyType="done"
                  />

                  <Button
                    title={isLoading ? 'Sending...' : 'Send Reset Instructions'}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isLoading}
                    loading={isSubmitting}
                    variant="primary"
                    size="lg"
                    fullWidth
                    accessibilityLabel="Send password reset instructions"
                    style={styles.requestBtn}
                  />
                </>
              )}
            </View>

            <AuthFooter
              links={[
                {
                  label: 'Back to Login',
                  onPress: () => navigation.navigate('Login'),
                },
              ]}
            />
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
  requestBtn: {
    marginTop: spacing.sm,
  },
  rateLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  rateLimitText: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ForgotPasswordScreen;
