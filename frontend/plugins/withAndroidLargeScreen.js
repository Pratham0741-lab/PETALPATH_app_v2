const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to enable proper large-screen (tablet) support on Android.
 *
 * What it does:
 * - Sets android:resizeableActivity="true" on MainActivity
 *   → Tells Android the app can resize to fill the full screen on tablets
 *   → Prevents Android from placing the app in a phone compatibility window
 *
 * Note: screenOrientation is controlled by Expo's "orientation" field in app.json.
 * When set to "default", Expo generates android:screenOrientation="unspecified",
 * which allows both portrait and landscape.
 */
module.exports = function withAndroidLargeScreen(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application?.[0];

    if (!application?.activity) {
      return config;
    }

    // Find MainActivity
    const mainActivity = application.activity.find(
      (activity) => activity.$?.['android:name'] === '.MainActivity'
    );

    if (mainActivity?.$) {
      // Allow activity to resize freely on large screens
      mainActivity.$['android:resizeableActivity'] = 'true';
    }

    return config;
  });
};
