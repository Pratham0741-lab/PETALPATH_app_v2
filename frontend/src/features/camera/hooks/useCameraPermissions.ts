import { useState, useCallback, useEffect } from 'react';
import { useCameraPermission } from 'react-native-vision-camera';

export type PermissionState = 'granted' | 'denied' | 'not-determined';

export function useCameraPermissions() {
  const { hasPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const [status, setStatus] = useState<PermissionState>('not-determined');
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  useEffect(() => {
    if (hasPermission) {
      setStatus('granted');
    } else if (hasPermission === false && status === 'granted') {
      setStatus('denied');
    }
  }, [hasPermission, status]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    try {
      const granted = await requestCameraPermission();
      setStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      setStatus('denied');
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, [requestCameraPermission]);

  return {
    hasPermission: status === 'granted',
    permissionStatus: status,
    isRequesting,
    requestPermission,
  };
}
