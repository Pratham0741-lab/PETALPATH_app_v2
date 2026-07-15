import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { useAppStore } from '../../store/appStore';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { api } from '../../api/client';
import { toUserMessage } from '../../api/errors';
import { isValidEmail } from '../../auth';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const setSession = useAppStore((state) => state.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '244358134848-cblimclem7n3knhsu6ahu29kd7l0pqve.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const response = await api.post('/auth/login', vars);
      return response.data;
    },
    onSuccess: (data) => {
      setSession(data);
    },
    onError: (err) => {
      setFormError(toUserMessage(err));
    },
  });

  const validate = (): boolean => {
    let valid = true;
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      valid = false;
    } else if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  };

  const handleLogin = () => {
    setFormError('');
    if (!validate()) {
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  const handleGoogleLogin = async () => {
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

        const apiResponse = await api.post('/auth/google', { idToken });
        setSession(apiResponse.data);
        Alert.alert('Welcome Back!', `Signed in via Google successfully.`);
      } else {
        console.log('Google Sign-in cancelled by user');
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Google Sign-in cancelled');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setFormError('Google sign-in is already in progress.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setFormError('Google Play Services not available or outdated.');
      } else {
        setFormError(toUserMessage(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const isLoading = loginMutation.isPending || googleLoading;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>PetalPath 🌸</Text>
          <Text style={styles.subtitle}>Begin your language learning journey!</Text>
        </View>

        <View style={styles.form}>
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          {/* Google Sign In (Primary) */}
          <AppButton
            label={googleLoading ? 'Connecting...' : 'Continue with Google'}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            variant="primary"
            style={styles.googleBtn}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Login Form (Secondary) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              placeholder="explorer@petalpath.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              accessibilityLabel="Email address"
              editable={!isLoading}
              style={[styles.input, emailError ? styles.inputError : null]}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, passwordError ? styles.inputWrapError : null]}>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                accessibilityLabel="Password"
                editable={!isLoading}
                style={[styles.input, styles.inputNoBorder]}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          </View>

          <AppButton
            label={loginMutation.isPending ? 'Logging in...' : 'Login'}
            onPress={handleLogin}
            disabled={isLoading}
            variant="primary"
            style={styles.loginBtn}
          />

          <View style={styles.links}>
            <Text
              style={styles.linkText}
              onPress={() => !isLoading && navigation.navigate('Register')}
            >
              Don't have an account? Sign Up
            </Text>
            <Text
              style={styles.linkText}
              onPress={() => !isLoading && navigation.navigate('ForgotPassword')}
            >
              Forgot Password?
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  errorText: {
    color: '#EF4444',
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  label: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  inputWrapError: {
    borderColor: '#EF4444',
  },
  inputNoBorder: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldError: {
    color: '#EF4444',
    fontSize: typography.sizes.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.xs,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.xs,
  },
  loginBtn: {
    marginTop: spacing.sm,
  },
  links: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkText: {
    color: colors.purple,
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
