import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { useAppStore } from '../../store/appStore';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { api } from '../../api/client';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const setSession = useAppStore((state) => state.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '244358134848-cblimclem7n3knhsu6ahu29kd7l0pqve.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all email and password fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      setSession(response.data);
      Alert.alert('Welcome Back!', `Logged in successfully.`);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
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
        setError('Google sign-in is already in progress.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available or outdated.');
      } else {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>PetalPath 🌸</Text>
          <Text style={styles.subtitle}>Begin your language learning journey!</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Google Sign In (Primary) */}
          <AppButton
            label={googleLoading ? 'Connecting...' : 'Continue with Google'}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
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
              onChangeText={setEmail}
              placeholder="explorer@petalpath.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <AppButton
            label={loading ? 'Logging in...' : 'Login'}
            onPress={handleLogin}
            variant="primary"
            style={styles.loginBtn}
          />

          <View style={styles.links}>
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate('Register')}
            >
              Don't have an account? Sign Up
            </Text>
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate('ForgotPassword')}
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
    marginTop: spacing.md,
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

