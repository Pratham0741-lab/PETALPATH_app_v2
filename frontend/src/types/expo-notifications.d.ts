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
    Max: number;
    High: number;
    Default: number;
    Low: number;
    Min: number;
    None: number;
    Unspecified: number;
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
