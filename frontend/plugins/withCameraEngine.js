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
    if (contents.includes(importLine)) {
      return config; // Already registered
    }

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

    // Enable Fabric + TurboModule interop for the custom native module
    // Insert ReactNativeFeatureFlags override in onCreate if not present
    if (!contents.includes('useFabricInterop')) {
      const featureFlagImports =
        'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags\n' +
        'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsDefaults\n';

      // Add feature flag imports after the CameraEnginePackage import
      contents = contents.replace(
        importLine + '\n',
        importLine + '\n' + featureFlagImports
      );

      // Add the override block at the start of onCreate
      const onCreateBlock = `    // Enable Fabric + TurboModule interop for custom native modules
    ReactNativeFeatureFlags.override(object : ReactNativeFeatureFlagsDefaults() {
      override fun useFabricInterop(): Boolean = true
      override fun useTurboModuleInterop(): Boolean = true
    })\n`;

      contents = contents.replace(
        /(override fun onCreate\(\)\s*\{)\s*\n/,
        `$1\n${onCreateBlock}`
      );
    }

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
