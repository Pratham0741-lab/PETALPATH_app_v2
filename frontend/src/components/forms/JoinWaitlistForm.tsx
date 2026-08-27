import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { FormInput } from './FormInput';
import { Button } from '../ui/Button';
import { joinWaitlist } from '../../api/waitlist';
import { ApiError, toUserMessage } from '../../api/errors';

const waitlistSchema = z.object({
  name: z
    .string()
    .min(1, 'Please enter your name.')
    .max(100, 'Name must be 100 characters or less.'),
  email: z
    .string()
    .email('Please enter a valid email address.'),
});

export type WaitlistFormData = z.infer<typeof waitlistSchema>;

export interface JoinWaitlistFormProps {
  onSuccess?: (message: string) => void;
  style?: object;
}

export const JoinWaitlistForm: React.FC<JoinWaitlistFormProps> = ({
  onSuccess,
  style,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = useCallback(
    async (data: WaitlistFormData) => {
      setFormError('');
      setSuccessMessage('');

      try {
        const response = await joinWaitlist({
          name: data.name.trim(),
          email: data.email.trim(),
        });

        const msg = response.message || "You're on the waitlist!";
        setSuccessMessage(msg);
        reset();
        onSuccess?.(msg);
      } catch (error: unknown) {
        const message =
          error instanceof ApiError ? error.userMessage : toUserMessage(error);
        setFormError(message);
      }
    },
    [reset, onSuccess]
  );

  const isLoading = isSubmitting;

  return (
    <View
      style={[
        styles.formContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadows.md,
        style,
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Join the Waitlist
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Be the first to experience playful learning with PetalPath.
      </Text>

      {formError ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.error + '15', borderColor: colors.error },
          ]}
        >
          <Text
            style={[styles.bannerText, { color: colors.error }]}
            accessibilityRole="alert"
          >
            {formError}
          </Text>
        </View>
      ) : null}

      {successMessage ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.success + '15', borderColor: colors.success },
          ]}
        >
          <Text
            style={[styles.bannerText, { color: colors.success }]}
            accessibilityRole="alert"
          >
            {successMessage}
          </Text>
        </View>
      ) : null}

      <FormInput
        name="name"
        control={control as any}
        label="Full Name"
        placeholder="Parent or Guardian Name"
        autoCapitalize="words"
        disabled={isLoading}
        returnKeyType="next"
      />

      <FormInput
        name="email"
        control={control as any}
        label="Email Address"
        placeholder="parent@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        disabled={isLoading}
        returnKeyType="done"
        onSubmitEditing={handleSubmit(onSubmit)}
      />

      <Button
        title={isLoading ? 'Joining...' : 'Join Waitlist'}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        loading={isSubmitting}
        variant="primary"
        size="lg"
        fullWidth
        accessibilityLabel="Join Waitlist button"
        style={styles.submitBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  title: {
    ...typography.presets.title,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.presets.subtle,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    ...typography.presets.subtle,
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
});

export default JoinWaitlistForm;
