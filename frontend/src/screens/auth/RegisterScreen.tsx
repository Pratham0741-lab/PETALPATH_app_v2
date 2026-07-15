import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { useAppStore } from '../../store/appStore';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { api } from '../../api/client';
import { toUserMessage } from '../../api/errors';
import { isValidEmail } from '../../auth';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const setSession = useAppStore((state) => state.setSession);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const registerMutation = useMutation({
    mutationFn: async (vars: { name: string; email: string; password: string }) => {
      const response = await api.post('/auth/register', vars);
      return response.data;
    },
    onSuccess: (data) => {
      setSession(data);
      Alert.alert('Welcome, Explorer!', `Account created successfully.`);
    },
    onError: (err) => {
      setFormError(toUserMessage(err));
    },
  });

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Please enter your full name.');
      valid = false;
    } else {
      setNameError('');
    }

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
      setPasswordError('Please enter a password.');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  };

  const handleRegister = () => {
    setFormError('');
    if (!validate()) {
      return;
    }
    registerMutation.mutate({ name: name.trim(), email: email.trim(), password });
  };

  const isLoading = registerMutation.isPending;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Join PetalPath 🌸</Text>
          <Text style={styles.subtitle}>Create an account to track your journey!</Text>
        </View>

        <View style={styles.form}>
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError('');
              }}
              placeholder="Little Explorer"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              accessibilityLabel="Full name"
              editable={!isLoading}
              style={[styles.input, nameError ? styles.inputError : null]}
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
          </View>

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
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
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
            label={isLoading ? 'Creating Account...' : 'Sign Up'}
            onPress={handleRegister}
            disabled={isLoading}
            variant="accent"
            style={styles.signUpBtn}
          />

          <View style={styles.links}>
            <Text
              style={styles.linkText}
              onPress={() => !isLoading && navigation.navigate('Login')}
            >
              Already have an account? Login
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
  signUpBtn: {
    marginTop: spacing.md,
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

export default RegisterScreen;
