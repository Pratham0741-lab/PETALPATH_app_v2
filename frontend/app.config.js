/**
 * Dynamic additions to app.json (Expo passes app.json in as `config`).
 *
 * 1. Release guard: preview and production builds must reach the server over
 *    HTTPS (they forbid cleartext, see plugins/withAndroidNetworkSecurity.js)
 *    and must have Google Sign-In configured. A build missing either would
 *    install fine and then fail at login, so the config refuses to load and the
 *    build stops before anything is compiled.
 *
 * 2. Google Sign-In: the iOS URL scheme is the web OAuth client ID reversed, so
 *    it is built from EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (eas.json env per
 *    profile, local .env files; see .env.example) instead of being written into
 *    app.json. Android does not use it.
 */
const GOOGLE_PLUGIN = '@react-native-google-signin/google-signin';
const CLIENT_SUFFIX = '.apps.googleusercontent.com';
/** Build profiles that ship to people (website APK, Play). */
const RELEASE_PROFILES = ['preview', 'production'];
const GOOGLE_WEB_CLIENT_ID = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

function releaseProblems(env) {
  const problems = [];
  const apiUrl = (env.EXPO_PUBLIC_API_URL || '').trim();
  if (!apiUrl) {
    problems.push('EXPO_PUBLIC_API_URL is not set');
  } else {
    let url = null;
    try {
      url = new URL(apiUrl);
    } catch {
      problems.push(`EXPO_PUBLIC_API_URL is not a valid URL ("${apiUrl}")`);
    }
    if (url && url.protocol !== 'https:') {
      problems.push(`EXPO_PUBLIC_API_URL must use https:// (got "${url.protocol}//${url.host}")`);
    }
  }
  const clientId = (env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
  if (!clientId) {
    problems.push('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
  } else if (!GOOGLE_WEB_CLIENT_ID.test(clientId)) {
    problems.push('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not a Google OAuth web client ID (…apps.googleusercontent.com)');
  }
  return problems;
}

module.exports = ({ config }) => {
  const profile = (process.env.EAS_BUILD_PROFILE || '').trim();
  if (RELEASE_PROFILES.includes(profile)) {
    const problems = releaseProblems(process.env);
    if (problems.length > 0) {
      throw new Error(
        `[app.config] "${profile}" build stopped:\n  - ${problems.join('\n  - ')}\n` +
          'Set these in eas.json → build.' + profile + '.env.',
      );
    }
  }

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
