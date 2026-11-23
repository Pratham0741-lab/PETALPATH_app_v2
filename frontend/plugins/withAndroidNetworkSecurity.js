const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Network security: plain-HTTP (cleartext) traffic is allowed only in
 * development builds.
 *
 * A dev build talks to Metro and the local backend over the LAN by plain HTTP
 * (http://10.0.x.x:8081 / :5000), so it needs cleartext to any host. Every
 * other build — preview (the website APK) and production (Play) — talks only
 * to https://api.petalpath.co.in and the CloudFront CDN, so cleartext is
 * forbidden globally: nothing can ever be sent unencrypted.
 *
 * Which build this is comes from EAS_BUILD_PROFILE, which EAS sets for cloud
 * and `eas build --local` builds. A local `expo prebuild` / `expo run:android`
 * has no profile and is treated as development; to prebuild a release locally,
 * run it with EAS_BUILD_PROFILE=production.
 */
function allowsCleartext() {
  const profile = (process.env.EAS_BUILD_PROFILE || '').trim();
  return profile === '' || profile === 'development';
}

function networkSecurityXml(cleartext) {
  if (cleartext) {
    return `<?xml version="1.0" encoding="utf-8"?>
<!-- Development build: plain HTTP allowed (Metro and the local backend over the LAN). -->
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;
  }
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Release build: HTTPS only, everywhere. -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;
}

module.exports = function withAndroidNetworkSecurity(config) {
  const cleartext = allowsCleartext();

  config = withAndroidManifest(config, async (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    mainApplication.$['android:usesCleartextTraffic'] = cleartext ? 'true' : 'false';
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, 'network_security_config.xml');
      fs.writeFileSync(filePath, networkSecurityXml(cleartext), 'utf8');
      console.log(
        `[withAndroidNetworkSecurity] ${cleartext ? 'Cleartext ALLOWED (development)' : 'Cleartext FORBIDDEN (release)'}` +
          ` — profile "${process.env.EAS_BUILD_PROFILE || '(local)'}"`,
      );
      return config;
    },
  ]);

  return config;
};
