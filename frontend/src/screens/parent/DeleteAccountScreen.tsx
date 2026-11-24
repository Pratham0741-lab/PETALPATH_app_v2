/**
 * Delete my account. Reached only from the unlocked Parents section.
 *
 * Says what will be deleted, then asks the parent to prove it is them: the
 * account password, or a fresh Google sign-in for a Google account (the server
 * accepts a Google token only if it was issued in the last few minutes). A
 * final confirmation, then DELETE /api/account. Only a confirmed deletion wipes
 * the device and signs out; any failure leaves everything as it was.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AppShell, Card, PageHeader, PetalIcon, PrimaryButton, SecondaryButton } from '../../components/design';
import { apiClient } from '../../services/api/apiClient';
import { customAlert } from '../../utils/alert';
import { colors, radius, spacing, typography } from '../../theme';
import { GOOGLE_WEB_CLIENT_ID, isGoogleSignInConfigured } from '../../config/google';
import {
  ACCOUNT_DELETION_MESSAGE,
  deleteAccount,
  outcomeMessage,
  type AccountProof,
} from '../../features/deletion/deletionFlow';
import { wipeDevice } from '../../features/deletion/deviceData';
import type { ApiResponse } from '../../types/api';

type Provider = 'email' | 'google';

export const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Which proof to ask for: the account's sign-in method, from the server.
  useEffect(() => {
    let alive = true;
    apiClient
      .get<ApiResponse<{ user: { provider?: string } }>>('/auth/me')
      .then((res) => alive && setProvider(res.data?.user?.provider === 'google' ? 'google' : 'email'))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (proof: AccountProof) => {
    setBusy(true);
    const outcome = await deleteAccount(proof, {
      deleteOnServer: (p) => apiClient.delete('/account', { data: p }),
      wipeDevice: () => wipeDevice(queryClient),
    });
    setBusy(false);
    const { title, message } = outcomeMessage(outcome, 'account');
    customAlert(title, message);
    // On success the wipe already signed out: the app is back at its first screen.
  };

  /** Last chance to stop, then delete. */
  const confirmThen = (proof: AccountProof) =>
    customAlert('Delete your account?', ACCOUNT_DELETION_MESSAGE, [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete forever', style: 'destructive', onPress: () => void run(proof) },
    ]);

  const withPassword = () => {
    if (!password) return;
    confirmThen({ password });
  };

  const withGoogle = async () => {
    if (!isGoogleSignInConfigured()) {
      customAlert('Not available', "Google sign-in isn't available in this version of the app.");
      return;
    }
    try {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Sign out of the Google SDK first so it asks again and issues a new token.
      await GoogleSignin.signOut().catch(() => undefined);
      const res = await GoogleSignin.signIn();
      const idToken = res.type === 'success' ? res.data.idToken : null;
      if (!idToken) return; // cancelled
      confirmThen({ googleIdToken: idToken });
    } catch {
      customAlert('Not deleted', "Google sign-in didn't complete. Nothing was deleted.");
    }
  };

  return (
    <AppShell petals="none" scroll header={<PageHeader title="Delete my account" onBack={() => navigation.goBack()} />}>
      <View style={styles.body}>
        <Card variant="raised" padding="roomy" accent={colors.error}>
          <View style={styles.head}>
            <PetalIcon name="warning" size={22} color={colors.error} />
            <Text style={[typography.presets.cardTitle, styles.title]}>This cannot be undone</Text>
          </View>
          <Text style={[typography.presets.body, styles.prose]}>{ACCOUNT_DELETION_MESSAGE}</Text>
        </Card>

        <Card variant="flat" padding="roomy">
          {loadError ? (
            <Text style={[typography.presets.body, styles.prose]}>
              We couldn&apos;t reach PetalPath. Deleting your account needs a connection. Please try again later.
            </Text>
          ) : provider === null ? (
            <Text style={[typography.presets.body, styles.muted]}>Checking your account…</Text>
          ) : provider === 'google' ? (
            <>
              <Text style={[typography.presets.body, styles.prose]}>
                To confirm it&apos;s you, sign in with Google again.
              </Text>
              <PrimaryButton
                label={busy ? 'Deleting…' : 'Confirm with Google'}
                tone="danger"
                size="lg"
                fullWidth
                loading={busy}
                disabled={busy}
                onPress={withGoogle}
              />
            </>
          ) : (
            <>
              <Text style={[typography.presets.body, styles.prose]}>To confirm it&apos;s you, enter your password.</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                editable={!busy}
                accessibilityLabel="Your account password"
                returnKeyType="done"
                onSubmitEditing={withPassword}
              />
              <PrimaryButton
                label={busy ? 'Deleting…' : 'Delete my account'}
                icon="trash"
                tone="danger"
                size="lg"
                fullWidth
                loading={busy}
                disabled={busy || !password}
                onPress={withPassword}
              />
            </>
          )}
        </Card>

        <SecondaryButton label="Keep my account" fill="outline" onPress={() => navigation.goBack()} disabled={busy} />
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { color: colors.error },
  prose: { color: colors.text, marginBottom: spacing.md },
  muted: { color: colors.textMuted },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.cardInner,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    ...typography.presets.body,
  },
});

export default DeleteAccountScreen;
