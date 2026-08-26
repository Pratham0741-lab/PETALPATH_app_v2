/**
 * Ambient stub for `expo-notifications`.
 *
 * `expo-notifications` IS installed and ships its own types, but this module
 * declaration shadows them, so anything declared wrongly here typechecks and
 * then fails at runtime. That is exactly what happened with `AndroidImportance`:
 * the real enum is SCREAMING_CASE (`MAX = 7`), this stub declared `Max`, and
 * `notificationService` was passing `undefined` as the Android channel
 * importance — so the default channel was created without a heads-up priority
 * and nobody noticed, because the stub said it was fine.
 *
 * Keep the member names here identical to
 * `expo-notifications/build/NotificationChannelManager.types.d.ts`.
 */
declare module 'expo-notifications' {
  export interface NotificationContent {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface NotificationRequestInput {
    content: NotificationContent;
    trigger: NotificationTriggerInput | null;
  }

  export type NotificationTriggerInput = unknown;

  export interface PermissionResponse {
    status: string;
    expires: string;
    canAskAgain: boolean;
    granted: boolean;
  }

  export interface ExpoPushToken {
    data: string;
    type: string;
  }

  export const AndroidImportance: {
    UNKNOWN: number;
    UNSPECIFIED: number;
    NONE: number;
    MIN: number;
    LOW: number;
    DEFAULT: number;
    HIGH: number;
    MAX: number;
  };

  export function getPermissionsAsync(): Promise<PermissionResponse>;
  export function requestPermissionsAsync(): Promise<PermissionResponse>;
  export function getExpoPushTokenAsync(): Promise<ExpoPushToken>;
  export function setNotificationChannelAsync(
    channelId: string,
    options: {
      name: string;
      importance: number;
      vibrationPattern?: number[];
      lightColor?: string;
    },
  ): Promise<void>;
  export function scheduleNotificationAsync(
    request: NotificationRequestInput,
  ): Promise<string>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
}
