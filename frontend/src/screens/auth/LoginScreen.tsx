import React, { useState, useEffect, useCallback } from 'react';
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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { loginSchema } from '../../utils/validation';
import { FormInput } from '../../components/forms/FormInput';
import { FormPasswordInput } from '../../components/forms/FormPasswordInput';
import { FormSwitch } from '../../components/forms/FormSwitch';
import { Button } from '../../components/ui/Button';
import { AuthHeader } from '../../components/common/AuthHeader';
import { AuthFooter } from '../../components/common/AuthFooter';
import { AuthBackground } from '../../components/common/AuthBackground';
import { Screen } from '../../components/layout/Screen';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { authService } from '../../services/auth/authService';
import { storageService } from '../../services/storage/storageService';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { ApiError } from '../../api/errors';
import { toUserMessage } from '../../api/errors';
import type { AuthStackParamList } from '../../types/navigation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthResponse } from '../../types/auth';

const loginFormSchema = loginSchema.extend({
  rememberMe: z.boolean().optional(),
});
type LoginFormData = z.infer<typeof loginFormSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const REMEMBER_EMAIL_KEY = 'petalpath_remember_email';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { colors } = theme;
  const { isOffline } = useNetworkStatus();

  const [formError, setFormError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const setSession = useAuthStore((state) => state.setSession);
  const setAppSession = useAppStore((state) => state.setSession);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '244358134848-cblimclem7n3knhsu6ahu29kd7l0pqve.apps.googleusercontent.com',
      offlineAccess: true,
    });

    storageService.getItem<string>(REMEMBER_EMAIL_KEY as never).then((savedEmail) => {
      if (savedEmail) {
        setValue('email', savedEmail);
        setValue('rememberMe', true);
      }
    });
  }, [setValue]);

  const onSubmit = useCallback(async (data: LoginFormData) => {
    setFormError('');

    try {
      const authResponse = await authService.login(data.email.trim(), data.password);
      await setSession(authResponse);
      await setAppSession(authResponse);

      if (data.rememberMe) {
        await storageService.setItem(REMEMBER_EMAIL_KEY as never, data.email.trim());
      } else {
        await storageService.removeItem(REMEMBER_EMAIL_KEY as never);
      }
    } catch (error: unknown) {
      const message = error instanceof ApiError ? error.userMessage : toUserMessage(error);
      setFormError(message);
    }
  }, [setSession, setAppSession]);

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);
    setFormError('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type === 'success') {
        const idToken = response.data.idToken;
        if (!idToken) {
          throw new Error('Google Sign-In returned no ID Token.');
        }

        const { apiClient } = await import('../../services/api/apiClient');
        const apiResponse = await apiClient.post<{ success: boolean; data: AuthResponse }>(
          '/auth/google',
          { idToken },
        );

        if (apiResponse.success && apiResponse.data) {
          await setSession(apiResponse.data);
          await setAppSession(apiResponse.data);
        } else {
          throw new ApiError(401, 'Google sign-in failed', 'Google sign-in failed. Please try again.');
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      const message = err instanceof ApiError ? err.userMessage : toUserMessage(err);
      setFormError(message);
    } finally {
      setGoogleLoading(false);
    }
  }, [setSession, setAppSession]);

  const isLoading = isSubmitting || googleLoading;

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
              title="Welcome Back!"
              subtitle="Begin your language learning journey!"
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

              {isOffline ? (
                <Text
                  style={[styles.offlineText, { color: colors.warning }]}
                  accessibilityRole="alert"
                >
                  You are offline. Please check your connection.
                </Text>
              ) : null}

              <Button
                title={googleLoading ? 'Connecting...' : 'Continue with Google'}
                onPress={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                fullWidth
                leftIcon={<Ionicons name="logo-google" size={20} color={colors.primary} />}
                accessibilityLabel="Continue with Google"
                style={styles.googleBtn}
              />

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                  or continue with email
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <FormInput
                name="email"
                control={control as any}
                label="Email Address"
                placeholder="explorer@petalpath.com"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isLoading}
                returnKeyType="next"
              />

              <FormPasswordInput
                name="password"
                control={control as any}
                label="Password"
                placeholder="Enter your password"
                disabled={isLoading}
                returnKeyType="done"
              />

              <FormSwitch
                name="rememberMe"
                control={control as any}
                label="Remember me"
                disabled={isLoading}
              />

              <Button
                title={isLoading ? 'Logging in...' : 'Login'}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                loading={isSubmitting}
                variant="primary"
                size="lg"
                fullWidth
                accessibilityLabel="Login button"
                style={styles.loginBtn}
              />
            </View>

            <AuthFooter
              links={[
                {
                  label: "Don't have an account? Sign Up",
                  onPress: () => { if (!isLoading) navigation.navigate('Register'); },
                },
                {
                  label: 'Forgot Password?',
                  onPress: () => { if (!isLoading) navigation.navigate('ForgotPassword'); },
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
  offlineText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  googleBtn: {
    marginBottom: spacing.sm,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.xs,
  },
  loginBtn: {
    marginTop: spacing.sm,
  },
});

export default LoginScreen;
