import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { api } from '../../api/client';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setResetToken('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data && response.data.resetToken) {
        setResetToken(response.data.resetToken);
        Alert.alert('Reset Token Generated', 'A mock token has been generated and is shown on screen.');
      } else {
        Alert.alert('Success', 'Password reset instructions have been simulated.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password? 🔑</Text>
          <Text style={styles.subtitle}>No worries! Enter your email to reset your password.</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!resetToken ? (
            <>
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

              <AppButton
                label={loading ? 'Requesting...' : 'Generate Reset Token'}
                onPress={handleForgotPassword}
                variant="accent"
                style={styles.requestBtn}
              />
            </>
          ) : (
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Mock Reset Token:</Text>
              <Text selectable style={styles.tokenText}>{resetToken}</Text>
              <Text style={styles.tokenHint}>Copy this code and click below to reset your password!</Text>

              <AppButton
                label="Go to Reset Password Screen"
                onPress={() => navigation.navigate('ResetPassword', { token: resetToken })}
                variant="primary"
                style={styles.resetNavBtn}
              />
            </View>
          )}

          <View style={styles.links}>
            <Text 
              style={styles.linkText} 
              onPress={() => navigation.navigate('Login')}
            >
              Back to Login
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
  requestBtn: {
    marginTop: spacing.md,
  },
  tokenContainer: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  tokenLabel: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  tokenText: {
    color: colors.yellow,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    padding: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  tokenHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  resetNavBtn: {
    width: '100%',
  },
  links: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: colors.purple,
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordScreen;
