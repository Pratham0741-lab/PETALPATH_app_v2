/**
 * What the server says it can do (GET /api/config/public). Pure: the fetcher
 * is passed in, so this can be unit-tested without React Native.
 *
 * Fail-safe: anything other than a well-formed `true` means "not available",
 * so the app never claims an email was sent when the server can't send one.
 */
export interface PublicConfig {
  readonly passwordResetEmail: boolean;
}

export const SAFE_PUBLIC_CONFIG: PublicConfig = { passwordResetEmail: false };

/** Keep only the known boolean, defaulting to false. */
export function parsePublicConfig(body: unknown): PublicConfig {
  const data = (body as { data?: { passwordResetEmail?: unknown } } | null)?.data;
  return { passwordResetEmail: data?.passwordResetEmail === true };
}

/**
 * A loader that asks the server once per app run and caches a success.
 * A failure is not cached (the next call tries again) and returns the safe default.
 */
export function createPublicConfigLoader(fetcher: () => Promise<unknown>) {
  let cached: PublicConfig | null = null;
  let inFlight: Promise<PublicConfig> | null = null;
  return function load(): Promise<PublicConfig> {
    if (cached) return Promise.resolve(cached);
    if (!inFlight) {
      inFlight = fetcher()
        .then((body) => (cached = parsePublicConfig(body)))
        .catch(() => SAFE_PUBLIC_CONFIG)
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
}

/** What the forgot-password screen shows after the parent submits an email. */
export type ForgotPasswordOutcome =
  | { kind: 'email-sent'; title: string; message: string; showResetCodeButton: true }
  | { kind: 'contact-support'; title: string; message: string; showResetCodeButton: false };

export function forgotPasswordOutcome(config: PublicConfig, supportEmail: string): ForgotPasswordOutcome {
  if (config.passwordResetEmail) {
    return {
      kind: 'email-sent',
      title: 'Check Your Email',
      message:
        "If an account exists for that email, we've sent instructions. The code in the email works once and expires in 30 minutes.",
      showResetCodeButton: true,
    };
  }
  return {
    kind: 'contact-support',
    title: 'Contact support',
    message: `Email reset isn't available yet. Please email ${supportEmail} and we'll help.`,
    showResetCodeButton: false,
  };
}
