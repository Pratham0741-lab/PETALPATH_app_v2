const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAndroidNetworkSecurity(config) {
  // 1. Modify AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    mainApplication.$['android:usesCleartextTraffic'] = 'true';

    return config;
  });

  // 2. Create and write network_security_config.xml resource file
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const androidResXmlPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );

      // Ensure directory exists
      if (!fs.existsSync(androidResXmlPath)) {
        fs.mkdirSync(androidResXmlPath, { recursive: true });
      }

      const filePath = path.join(androidResXmlPath, 'network_security_config.xml');
      const fileContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">13.235.178.117</domain>
    </domain-config>
</network-security-config>
`;

      fs.writeFileSync(filePath, fileContent, 'utf8');
      console.log(`[withAndroidNetworkSecurity] Wrote network_security_config.xml to ${filePath}`);

      return config;
    },
  ]);

  return config;
};
