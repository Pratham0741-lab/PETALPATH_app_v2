/**
 * Verifying a Google ID token from the app's native Google Sign-In.
 *
 * The app signs in with the web OAuth client ID (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
 * so Google issues ID tokens whose audience (`aud`) is that client. A token is
 * accepted only when:
 *  - Google's library verifies its signature against Google's published keys,
 *    its issuer is Google, and it has not expired;
 *  - its audience is one of the configured client IDs (GOOGLE_CLIENT_ID,
 *    comma-separated), so a token minted for any other client — including the
 *    old project's — is refused;
 *  - Google says the email address is verified, since accounts are matched and
 *    linked by email.
 *
 * Any failure is a 401 with a generic message; the reason is logged, never the
 * token.
 */
import type { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const REJECTED = 'Google ID token verification failed';

export async function verifyGoogleIdToken(
  client: OAuth2Client,
  idToken: string,
  audiences: readonly string[],
): Promise<TokenPayload> {
  if (audiences.length === 0) {
    logger.error('GOOGLE_CLIENT_ID is empty: Google sign-in cannot be verified');
    throw new UnauthorizedError(REJECTED);
  }

  let payload: TokenPayload | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: [...audiences] });
    payload = ticket.getPayload();
  } catch (error) {
    logger.warn({ reason: (error as Error).message }, 'Google token verification failed');
    throw new UnauthorizedError(REJECTED);
  }

  if (!payload) {
    logger.warn('Google token verification failed: empty payload');
    throw new UnauthorizedError(REJECTED);
  }
  if (payload.email_verified !== true) {
    logger.warn({ sub: payload.sub }, 'Google sign-in refused: email address not verified');
    throw new UnauthorizedError(REJECTED);
  }
  return payload;
}
