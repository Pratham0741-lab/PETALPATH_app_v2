import { useState, useCallback, useEffect } from 'react';
import { PermissionsAndroid, Platform, Linking } from 'react-native';

export type PermissionState = 'granted' | 'denied' | 'not-determined';

export function useCameraPermissions() {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('not-determined');
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        setHasPermission(granted);
        setPermissionStatus(granted ? 'granted' : 'not-determined');
        return granted;
      } catch (e) {
        console.warn('Check camera permission error:', e);
      }
    }
    return false;
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'PetalPath Camera Access',
            message: 'Allow PetalPath to use your camera for real-time body movement and posture activities.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          setPermissionStatus('granted');
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          setHasPermission(false);
          setPermissionStatus('denied');
          Linking.openSettings();
          return false;
        } else {
          setHasPermission(false);
          setPermissionStatus('denied');
          return false;
        }
      } else {
        // iOS or fallback
        setHasPermission(true);
        setPermissionStatus('granted');
        return true;
      }
    } catch (e) {
      console.warn('Request camera permission error:', e);
      Linking.openSettings();
    } finally {
      setIsRequesting(false);
    }
    return false;
  }, []);

  return {
    hasPermission,
    permissionStatus,
    isRequesting,
    requestPermission,
  };
}
