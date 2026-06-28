/**
 * Centralized API Configuration
 *
 * Reads EXPO_PUBLIC_API_URL from environment variables (set via .env files).
 * All networking code should import from this module — never hardcode URLs.
 *
 * Switching environments requires changing only the .env file:
 *   - .env.development  → http://192.168.X.X:5000
 *   - .env.production   → http://13.235.178.117
 *   - Future            → https://api.petalpath.in
 */

function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;

  if (!raw) {
    throw new Error(
      '[PetalPath] EXPO_PUBLIC_API_URL is not set.\n' +
      'Create a .env file in the project root with:\n' +
      '  EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_IP:PORT\n' +
      'See .env.development for local dev or .env.production for EC2.'
    );
  }

  // Strip trailing slash(es) to prevent double-slash in endpoint URLs
  return raw.replace(/\/+$/, '');
}

/** Whether we are running in Expo/Metro development mode */
export const IS_DEV: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

/**
 * The base server URL (no path suffix).
 * Example: `http://13.235.178.117`
 */
export const API_BASE_URL: string = getApiBaseUrl();

// DEBUG ONLY - REMOVE AFTER NETWORK DIAGNOSIS
console.log("========== PETALPATH CONFIG ==========");
console.log("API_BASE_URL:", API_BASE_URL);
console.log("EXPO_PUBLIC_API_URL:", process.env.EXPO_PUBLIC_API_URL);
console.log("__DEV__:", __DEV__);
console.log("======================================");
// END DEBUG ONLY

/**
 * The API endpoint prefix for REST calls.
 * Example: `http://13.235.178.117/api`
 */
export const API_URL: string = `${API_BASE_URL}/api`;

/**
 * The static storage URL for serving audio, video, and other media.
 * Example: `http://13.235.178.117/storage`
 */
export const STORAGE_URL: string = `${API_BASE_URL}/storage`;
