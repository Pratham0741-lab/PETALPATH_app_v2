import { create } from 'zustand';

interface NotificationState {
  pushToken: string | null;
  notificationsEnabled: boolean;
  lastCheckedAt: string | null;
  unreadCount: number;

  setPushToken: (token: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLastCheckedAt: (timestamp: string) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pushToken: null,
  notificationsEnabled: true,
  lastCheckedAt: null,
  unreadCount: 0,

  setPushToken: (token: string) => {
    set({ pushToken: token });
  },

  setNotificationsEnabled: (enabled: boolean) => {
    set({ notificationsEnabled: enabled });
  },

  setLastCheckedAt: (timestamp: string) => {
    set({ lastCheckedAt: timestamp });
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },

  incrementUnread: () => {
    set((state) => ({ unreadCount: state.unreadCount + 1 }));
  },

  resetUnread: () => {
    set({ unreadCount: 0 });
  },
}));
