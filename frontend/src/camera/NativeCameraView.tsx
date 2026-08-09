import React from 'react';
import { requireNativeComponent, StyleSheet, View, Text, Platform, UIManager } from 'react-native';

const VIEW_NAME = 'PetalPathNativeCameraView';

/**
 * Resolution of the native view manager is deliberately LAZY (resolved on first
 * render rather than at module import time).
 *
 * Under the New Architecture (bridgeless), the native component registry is not
 * guaranteed to be populated at the moment this module is first imported. A
 * module-scope lookup can therefore produce a false negative that is cached for
 * the lifetime of the app, permanently downgrading the app to the fallback view.
 */
type Resolution = {
  component: any | null;
  reason: 'OK' | 'UNSUPPORTED_PLATFORM' | 'NOT_REGISTERED' | 'LOOKUP_FAILED';
};

let cached: Resolution | null = null;

/**
 * Returns true when the native view manager is registered.
 *
 * IMPORTANT: under bridgeless, `UIManager.getViewManagerConfig()` returns null
 * for legacy (Fabric-interop) view managers and emits a soft error — it only
 * works when the native ViewConfig interop layer is enabled. `hasViewManagerConfig()`
 * is the supported bridgeless check, so it must be preferred. The previous
 * implementation used only `getViewManagerConfig()`, which always reported the
 * view as missing on the New Architecture and forced the fallback placeholder.
 */
function isViewManagerRegistered(): boolean {
  const um = UIManager as any;

  // Preferred path (New Architecture / bridgeless).
  if (typeof um.hasViewManagerConfig === 'function') {
    try {
      if (um.hasViewManagerConfig(VIEW_NAME) === true) {
        return true;
      }
    } catch (error) {
      // `unstable_hasComponent` throws if the global registry is not installed yet.
      // Fall through to the legacy check rather than treating this as "missing".
    }
  }

  // Legacy path (old architecture / Paper).
  if (typeof um.getViewManagerConfig === 'function') {
    try {
      if (um.getViewManagerConfig(VIEW_NAME) != null) {
        return true;
      }
    } catch (error) {
      // ignored — handled by caller
    }
  }

  return false;
}

function resolveNativeComponent(): Resolution {
  if (cached) {
    return cached;
  }

  if (Platform.OS !== 'android') {
    cached = { component: null, reason: 'UNSUPPORTED_PLATFORM' };
    return cached;
  }

  if (!isViewManagerRegistered()) {
    // Do NOT cache a negative result: the registry may still be initialising.
    // Caching here is what previously made the fallback state permanent.
    return { component: null, reason: 'NOT_REGISTERED' };
  }

  try {
    cached = { component: requireNativeComponent<any>(VIEW_NAME), reason: 'OK' };
  } catch (error) {
    console.warn(`[NativeCameraView] Failed to load native view "${VIEW_NAME}":`, error);
    return { component: null, reason: 'LOOKUP_FAILED' };
  }

  return cached;
}

/** Whether the native camera preview is usable on this device/build. */
export function isNativeCameraViewAvailable(): boolean {
  return resolveNativeComponent().component != null;
}

interface NativeCameraViewProps {
  style?: any;
}

export const NativeCameraView: React.FC<NativeCameraViewProps> = ({ style }) => {
  const { component: Native, reason } = resolveNativeComponent();

  if (Native) {
    return <Native style={[styles.full, style]} />;
  }

  const message =
    Platform.OS !== 'android'
      ? 'Camera pose engine is Android-only right now.'
      : 'Camera engine is not included in this build.';

  const hint =
    Platform.OS !== 'android'
      ? undefined
      : 'Native modules cannot be delivered over-the-air — install a new development/preview build.';

  return (
    <View style={[styles.fallback, style]}>
      <Text style={styles.fallbackText}>{message}</Text>
      {hint ? <Text style={styles.fallbackHint}>{hint}</Text> : null}
      {__DEV__ ? <Text style={styles.fallbackCode}>{`view: ${VIEW_NAME} • ${reason}`}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  fallbackHint: {
    color: '#AAAAAA',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  fallbackCode: {
    color: '#666666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default NativeCameraView;
