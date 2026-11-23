/**
 * Google Sign-In configuration.
 *
 * The web OAuth client ID comes from EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (set per
 * build profile in eas.json, and in the local .env files; see .env.example).
 * It is the client the backend checks ID tokens against (GOOGLE_CLIENT_ID).
 * Android OAuth clients are not configured here: Google matches them by the
 * app's package name and signing certificate.
 */
export const GOOGLE_WEB_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';

export const isGoogleSignInConfigured = (): boolean => GOOGLE_WEB_CLIENT_ID.length > 0;
