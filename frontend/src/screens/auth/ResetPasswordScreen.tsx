import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { resetPasswordSchema } from '../../utils/validation';
import { FormInput } from '../../components/forms/FormInput';
import { FormPasswordInput } from '../../components/forms/FormPasswordInput';
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
import type { RouteProp } from '@react-navigation/native';
import type { z } from 'zod';
import type { ApiResponse } from '../../types/api';

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type RouteType = RouteProp<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const { colors } = theme;

  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (route.params?.token) {
      setValue('token', route.params.token);
    }
  }, [route.params?.token, setValue]);

  useEffect(() => {
    if (isSuccess) {
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        navigation.navigate('Login');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isSuccess, checkmarkScale, navigation]);

  const onSubmit = useCallback(async (data: ResetPasswordFormData) => {
    setFormError('');

    try {
      await apiClient.post<ApiResponse<null>>('/auth/reset-password', {
        token: data.token.trim(),
        newPassword: data.password,
      });
      setIsSuccess(true);
    } catch (error: unknown) {
      const message = error instanceof ApiError ? error.userMessage : toUserMessage(error);
      setFormError(message);
    }
  }, []);

  const isLoading = isSubmitting;

  if (isSuccess) {
    return (
      <Screen padded>
        <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
          <Animated.View
            style={[
              styles.checkmarkWrapper,
              { transform: [{ scale: checkmarkScale }] },
            ]}
          >
            <View style={[styles.checkmarkCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={48} color={colors.textInverse} />
            </View>
          </Animated.View>
          <Text
            style={[styles.successTitle, { color: colors.text }]}
            accessibilityRole="alert"
          >
            Password Reset Successful!
          </Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
            Your password has been updated. Redirecting to login...
          </Text>
        </View>
      </Screen>
    );
  }

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
              title="Reset Password"
              subtitle="Enter your security token and choose a new password."
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

              {!route.params?.token ? (
                <FormInput
                  name="token"
                  control={control as any}
                  label="Reset Code / Token"
                  placeholder="Enter reset token"
                  autoCapitalize="none"
                  disabled={isLoading}
                  returnKeyType="next"
                />
              ) : null}

              <FormPasswordInput
                name="password"
                control={control as any}
                label="New Password"
                placeholder="Min. 8 characters, 1 letter & 1 number"
                disabled={isLoading}
                returnKeyType="next"
              />

              <FormPasswordInput
                name="confirmPassword"
                control={control as any}
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                disabled={isLoading}
                returnKeyType="done"
              />

              <Button
                title={isLoading ? 'Resetting...' : 'Update Password'}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                loading={isSubmitting}
                variant="primary"
                size="lg"
                fullWidth
                accessibilityLabel="Update password button"
                style={styles.resetBtn}
              />
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
  resetBtn: {
    marginTop: spacing.sm,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  checkmarkWrapper: {
    marginBottom: spacing.xl,
  },
  checkmarkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: typography.sizes.xl,
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

export default ResetPasswordScreen;
