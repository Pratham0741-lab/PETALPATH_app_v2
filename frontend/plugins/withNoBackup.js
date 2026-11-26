const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * No Android backup or device-to-device transfer of app data.
 *
 * The app holds children's data and sign-in tokens. `android:allowBackup=false`
 * (app.json) stops cloud backup, but on Android 12+ device-to-device transfer
 * is governed only by `android:dataExtractionRules`, so those rules exclude
 * every domain from both. Android 11 and lower honour allowBackup alone.
 *
 * Effect: after a reinstall or a new phone, the parent signs in again and the
 * app re-downloads progress from the server; nothing is restored locally.
 * expo-secure-store's own backup rules are turned off in app.json
 * (configureAndroidBackup: false) so they don't replace these.
 */
const RULES = 'no_backup_data_extraction_rules';
const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];

function rulesXml() {
  const excludes = DOMAINS.map((d) => `    <exclude domain="${d}" path="." />`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Nothing is backed up to the cloud or copied to a new phone (plugins/withNoBackup.js). -->
<data-extraction-rules>
  <cloud-backup>
${excludes}
  </cloud-backup>
  <device-transfer>
${excludes}
  </device-transfer>
</data-extraction-rules>
`;
}

module.exports = function withNoBackup(config) {
  config = withAndroidManifest(config, async (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:dataExtractionRules'] = `@xml/${RULES}`;
    delete app.$['android:fullBackupContent'];
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${RULES}.xml`), rulesXml());
      return config;
    },
  ]);
};
