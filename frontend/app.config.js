/**
 * Dynamic additions to app.json (Expo passes app.json in as `config`).
 *
 * Google Sign-In: the iOS URL scheme is the web OAuth client ID reversed, so it
 * is built from EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (eas.json env per profile,
 * local .env files; see .env.example) instead of being written into app.json.
 * Android does not use it. Without the variable the plugin stays unconfigured
 * and the login screen says Google sign-in is unavailable.
 */
const GOOGLE_PLUGIN = '@react-native-google-signin/google-signin';
const CLIENT_SUFFIX = '.apps.googleusercontent.com';

module.exports = ({ config }) => {
  const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
  if (!webClientId) {
    console.warn(`[app.config] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set: ${GOOGLE_PLUGIN} is left unconfigured.`);
    return config;
  }
  const iosUrlScheme = `com.googleusercontent.apps.${webClientId.replace(CLIENT_SUFFIX, '')}`;
  const plugins = (config.plugins || []).map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name === GOOGLE_PLUGIN ? [GOOGLE_PLUGIN, { iosUrlScheme }] : plugin;
  });
  return { ...config, plugins };
};
