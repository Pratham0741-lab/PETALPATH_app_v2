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
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { registerSchema } from '../../utils/validation';
import { FormInput } from '../../components/forms/FormInput';
import { FormPasswordInput } from '../../components/forms/FormPasswordInput';
import { FormCheckbox } from '../../components/forms/FormCheckbox';
import { Button } from '../../components/ui/Button';
import { AuthHeader } from '../../components/common/AuthHeader';
import { AuthFooter } from '../../components/common/AuthFooter';
import { AuthBackground } from '../../components/common/AuthBackground';
import { Screen } from '../../components/layout/Screen';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { authService } from '../../services/auth/authService';
import { ApiError } from '../../api/errors';
import { toUserMessage } from '../../api/errors';
import type { AuthStackParamList } from '../../types/navigation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { z } from 'zod';

type RegisterFormData = z.infer<typeof registerSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { colors } = theme;

  const [formError, setFormError] = useState('');

  const setSession = useAuthStore((state) => state.setSession);
  const setAppSession = useAppStore((state) => state.setSession);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = useCallback(async (data: RegisterFormData) => {
    setFormError('');

    try {
      const authResponse = await authService.register(
        data.name.trim(),
        data.email.trim(),
        data.password,
      );
      await setSession(authResponse);
      await setAppSession(authResponse);
    } catch (error: unknown) {
      const message = error instanceof ApiError ? error.userMessage : toUserMessage(error);
      setFormError(message);
    }
  }, [setSession, setAppSession, navigation]);

  const isLoading = isSubmitting;

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
                title="Join PetalPath"
                subtitle="Create an account to track your journey!"
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

                <FormInput
                  name="name"
                  control={control as any}
                  label="Full Name"
                  placeholder="Little Explorer"
                  autoCapitalize="words"
                  disabled={isLoading}
                  returnKeyType="next"
                />

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
                  placeholder="Min. 8 characters, 1 letter & 1 number"
                  disabled={isLoading}
                  returnKeyType="next"
                />

                <FormPasswordInput
                  name="confirmPassword"
                  control={control as any}
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  disabled={isLoading}
                  returnKeyType="done"
                />

                <FormCheckbox
                  name="acceptTerms"
                  control={control as any}
                  label="I accept the Terms and Conditions"
                  disabled={isLoading}
                />

                <Button
                  title={isLoading ? 'Creating Account...' : 'Sign Up'}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  loading={isSubmitting}
                  variant="primary"
                  size="lg"
                  fullWidth
                  accessibilityLabel="Sign up button"
                  style={styles.signUpBtn}
                />
              </View>

              <AuthFooter
                links={[
                  {
                    label: 'Already have an account? Login',
                    onPress: () => { if (!isLoading) navigation.navigate('Login'); },
                  },
                ]}
              />
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
  signUpBtn: {
    marginTop: spacing.sm,
  },
  authCardWrapper: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
});

export default RegisterScreen;
