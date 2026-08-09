const { withDangerousMod, withAppBuildGradle, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that injects the PetalPath Camera Engine native code
 * into the Android project during prebuild.
 *
 * It does three things:
 *   1. Copies Kotlin source files from plugins/camera-engine-src/java/ → android/app/src/main/java/
 *   2. Copies the TFLite model asset into android/app/src/main/assets/
 *   3. Adds CameraX + TFLite Gradle dependencies to app/build.gradle
 *   4. Registers CameraEnginePackage in MainApplication.kt
 */

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Step 1 + 2: Copy native Kotlin sources and TFLite model asset
function withCameraEngineFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;

      // --- Copy Kotlin source files ---
      const javaSrc = path.join(projectRoot, 'plugins', 'camera-engine-src', 'java');
      const javaDest = path.join(platformRoot, 'app', 'src', 'main', 'java');

      if (fs.existsSync(javaSrc)) {
        copyDirRecursive(javaSrc, javaDest);
        console.log('[withCameraEngine] Copied Kotlin sources →', javaDest);
      } else {
        console.warn('[withCameraEngine] WARNING: Kotlin source dir not found:', javaSrc);
      }

      // --- Copy TFLite model asset ---
      const modelSrc = path.join(projectRoot, 'plugins', 'camera-engine-src', 'assets', 'movenet_singlepose_lightning.tflite');
      const assetsDest = path.join(platformRoot, 'app', 'src', 'main', 'assets');

      if (fs.existsSync(modelSrc)) {
        if (!fs.existsSync(assetsDest)) {
          fs.mkdirSync(assetsDest, { recursive: true });
        }
        fs.copyFileSync(modelSrc, path.join(assetsDest, 'movenet_singlepose_lightning.tflite'));
        console.log('[withCameraEngine] Copied TFLite model →', assetsDest);
      } else {
        console.warn('[withCameraEngine] WARNING: TFLite model not found:', modelSrc);
      }

      return config;
    },
  ]);
}

// Step 3: Add Gradle dependencies
function withCameraEngineDeps(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    const marker = '// === PetalPath Camera Engine Dependencies ===';
    if (contents.includes(marker)) {
      return config; // Already injected
    }

    const depsBlock = `
    // === PetalPath Camera Engine Dependencies ===
    // TensorFlow Lite
    implementation("org.tensorflow:tensorflow-lite:2.14.0")
    implementation("org.tensorflow:tensorflow-lite-gpu:2.14.0")
    implementation("org.tensorflow:tensorflow-lite-support:0.4.4")

    // CameraX
    def camerax_version = "1.3.4"
    implementation("androidx.camera:camera-core:\${camerax_version}")
    implementation("androidx.camera:camera-camera2:\${camerax_version}")
    implementation("androidx.camera:camera-lifecycle:\${camerax_version}")
    implementation("androidx.camera:camera-view:\${camerax_version}")

    // Guava (required by CameraX)
    implementation("com.google.guava:guava:32.1.3-android")
    implementation("androidx.concurrent:concurrent-futures:1.1.0")
    // === End PetalPath Camera Engine Dependencies ===`;

    // Insert before the closing brace of the dependencies block
    config.modResults.contents = contents.replace(
      /^(\s*dependencies\s*\{[\s\S]*?)(^\})/m,
      `$1${depsBlock}\n$2`
    );

    console.log('[withCameraEngine] Injected Gradle dependencies');
    return config;
  });
}

// Step 4: Register CameraEnginePackage in MainApplication
function withCameraEnginePackage(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const importLine = 'import com.petalpath.camera.bridge.CameraEnginePackage';
    const alreadyRegistered = contents.includes(importLine);

    if (!alreadyRegistered) {
      // Add import after the last existing import
      const lastImportIndex = contents.lastIndexOf('import ');
      const endOfLastImport = contents.indexOf('\n', lastImportIndex);
      contents =
        contents.slice(0, endOfLastImport + 1) +
        importLine + '\n' +
        contents.slice(endOfLastImport + 1);

      // Register the package in the packages list
      // Look for the PackageList(...).packages pattern and add after it
      const packagesRegex = /(PackageList\(this\)\.packages)/;
      if (packagesRegex.test(contents)) {
        contents = contents.replace(
          packagesRegex,
          `$1.apply {\n          add(CameraEnginePackage())\n        }`
        );
      }
    }

    // Deliberately NO ReactNativeFeatureFlags.override() here.
    //
    // An earlier version of this plugin injected an override enabling
    // useFabricInterop / useTurboModuleInterop / useNativeViewConfigsInBridgelessMode.
    // That was both unnecessary and actively harmful:
    //
    //  1. Redundant — with newArchEnabled=true, loadReactNative() runs
    //     DefaultNewArchitectureEntryPoint.load(), which applies
    //     ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android. That extends
    //     ReactNativeNewArchitectureFeatureFlagsDefaults, which already returns true
    //     for all three flags.
    //  2. It disabled the New Architecture — the injected object extended the *base*
    //     ReactNativeFeatureFlagsDefaults, where enableBridgelessArchitecture,
    //     enableFabricRenderer and useTurboModules are all false. Only the three
    //     named flags were overridden, so those three silently became false.
    //  3. It double-overrode — ReactNativeFeatureFlagsAccessor::override() throws
    //     "Feature flags cannot be overridden more than once", and load() overrides
    //     after onCreate's call.
    //  4. It ran before SoLoader.init — ReactNativeFeatureFlagsCxxInterop loads
    //     "react_featureflagsjni" in its static initializer, and SoLoader is only
    //     initialized inside loadReactNative().
    //
    // Strip the block if a previous prebuild wrote it into an existing android/ project.
    contents = contents.replace(
      /[ \t]*\/\/ Enable Fabric \+ TurboModule interop for custom native modules\n[ \t]*ReactNativeFeatureFlags\.override\(object : ReactNativeFeatureFlagsDefaults\(\) \{[\s\S]*?\n[ \t]*\}\)\n/,
      ''
    );
    contents = contents.replace(
      /import com\.facebook\.react\.internal\.featureflags\.ReactNativeFeatureFlags(Defaults)?\n/g,
      ''
    );

    config.modResults.contents = contents;
    console.log('[withCameraEngine] Registered CameraEnginePackage in MainApplication');
    return config;
  });
}

module.exports = function withCameraEngine(config) {
  config = withCameraEngineFiles(config);
  config = withCameraEngineDeps(config);
  config = withCameraEnginePackage(config);
  return config;
};
