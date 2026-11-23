/**
 * Notifications are not part of the app today.
 *
 * Nothing scheduled a notification, registered for push, or sent a push token
 * to the server; the only caller was the onboarding permission screen, which
 * no route navigates to. expo-notifications was therefore removed (it also
 * pulled in Firebase Messaging, Firebase Installations and the Play Install
 * Referrer, plus boot, wake-lock and badge permissions). This module keeps its
 * interface so callers compile, and reports notifications as unavailable.
 *
 * To add notifications later: reinstall expo-notifications, restore the
 * implementation from git history (before this change), and declare it in the
 * Play Data safety form and privacy policy.
 */

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

async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

async function requestPermission(): Promise<boolean> {
  return false;
}

async function getPermissionStatus(): Promise<boolean> {
  return false;
}

async function scheduleLocalNotification(
  _title: string,
  _body: string,
  _data?: Record<string, unknown>,
): Promise<void> {}

async function cancelAllLocalNotifications(): Promise<void> {}

function handleNotificationResponse(
  response: unknown,
): { screen: string; params?: Record<string, string> } | null {
  if (!response || typeof response !== 'object') return null;

  const resp = response as NotificationResponse;
  const data: NotificationData | undefined = resp.notification?.data ?? resp.data;
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
