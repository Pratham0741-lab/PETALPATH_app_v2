import { IS_DEV } from '../../config/api';
import { useNotificationStore } from '../../store/notificationStore';

const logger = IS_DEV
  ? {
      info: (...args: unknown[]) => { console.info('[NotificationService]', ...args); },
      warn: (...args: unknown[]) => { console.warn('[NotificationService]', ...args); },
    }
  : {
      info: () => {},
      warn: () => {},
    };

interface NotificationData {
  screen?: string;
  params?: Record<string, string>;
  [key: string]: unknown;
}

interface NotificationResponse {
  notification?: {
    data?: NotificationData;
  };
  data?: NotificationData;
}

let isModuleAvailable: boolean | null = null;

async function checkModuleAvailability(): Promise<boolean> {
  if (isModuleAvailable !== null) return isModuleAvailable;
  try {
    await import('expo-notifications');
    isModuleAvailable = true;
  } catch {
    isModuleAvailable = false;
    logger.warn('expo-notifications is not installed. Notification features will be disabled.');
  }
  return isModuleAvailable;
}

async function registerForPushNotifications(): Promise<string | null> {
  const available = await checkModuleAvailability();
  if (!available) return null;

  try {
    const { getPermissionsAsync, requestPermissionsAsync, getExpoPushTokenAsync } = await import('expo-notifications');
    const { Platform } = await import('react-native');

    let finalStatus: string | undefined;

    if (Platform.OS === 'android') {
      const { setNotificationChannelAsync, AndroidImportance } = await import('expo-notifications');
      void setNotificationChannelAsync('default', {
        name: 'default',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await getPermissionsAsync();
    finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      useNotificationStore.getState().setNotificationsEnabled(false);
      logger.warn('Push notification permission not granted');
      return null;
    }

    useNotificationStore.getState().setNotificationsEnabled(true);

    const tokenData = await getExpoPushTokenAsync();
    const token = tokenData.data;

    useNotificationStore.getState().setPushToken(token);
    useNotificationStore.getState().setLastCheckedAt(new Date().toISOString());

    logger.info('Push token registered');
    return token;
  } catch (error) {
    logger.warn('Failed to register for push notifications:', error);
    return null;
  }
}

async function requestPermission(): Promise<boolean> {
  const available = await checkModuleAvailability();
  if (!available) return false;

  try {
    const { requestPermissionsAsync } = await import('expo-notifications');
    const { status } = await requestPermissionsAsync();
    const granted = status === 'granted';
    useNotificationStore.getState().setNotificationsEnabled(granted);
    return granted;
  } catch (error) {
    logger.warn('Failed to request notification permission:', error);
    return false;
  }
}

async function getPermissionStatus(): Promise<boolean> {
  const available = await checkModuleAvailability();
  if (!available) return false;

  try {
    const { getPermissionsAsync } = await import('expo-notifications');
    const { status } = await getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.warn('Failed to get permission status:', error);
    return false;
  }
}

async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const available = await checkModuleAvailability();
  if (!available) return;

  try {
    const { scheduleNotificationAsync } = await import('expo-notifications');
    await scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
    logger.info('Local notification scheduled');
  } catch (error) {
    logger.warn('Failed to schedule local notification:', error);
  }
}

async function cancelAllLocalNotifications(): Promise<void> {
  const available = await checkModuleAvailability();
  if (!available) return;

  try {
    const { cancelAllScheduledNotificationsAsync } = await import('expo-notifications');
    await cancelAllScheduledNotificationsAsync();
    logger.info('All local notifications cancelled');
  } catch (error) {
    logger.warn('Failed to cancel local notifications:', error);
  }
}

function handleNotificationResponse(
  response: unknown,
): { screen: string; params?: Record<string, string> } | null {
  if (!response || typeof response !== 'object') return null;

  const resp = response as NotificationResponse;

  let data: NotificationData | undefined;

  if (resp.notification?.data) {
    data = resp.notification.data;
  } else if (resp.data) {
    data = resp.data;
  }

  if (!data || !data.screen) return null;

  const { screen, params, ...rest } = data;

  const mergedParams: Record<string, string> = { ...(params ?? {}) };

  for (const key of Object.keys(rest)) {
    if (key !== 'screen' && typeof rest[key] === 'string') {
      mergedParams[key] = rest[key] as string;
    }
  }

  return {
    screen,
    params: Object.keys(mergedParams).length > 0 ? mergedParams : undefined,
  };
}

export const notificationService = {
  registerForPushNotifications,
  requestPermission,
  getPermissionStatus,
  scheduleLocalNotification,
  cancelAllLocalNotifications,
  handleNotificationResponse,
};
