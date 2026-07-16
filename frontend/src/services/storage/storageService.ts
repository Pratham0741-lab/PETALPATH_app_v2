import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_DEV } from '../../config/api';
import { StorageKeys } from './storageKeys';
import type { StorageKey } from './storageKeys';

const isWeb = Platform.OS === 'web';

const secureKeys: ReadonlySet<string> = new Set([
  StorageKeys.AUTH_TOKEN,
  StorageKeys.REFRESH_TOKEN,
  StorageKeys.USER,
]);

const logger = IS_DEV
  ? {
      info: (...args: unknown[]) => { console.info('[Storage]', ...args); },
      warn: (...args: unknown[]) => { console.warn('[Storage]', ...args); },
    }
  : {
      info: () => {},
      warn: () => {},
    };

interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function createWebBackend(): StorageBackend {
  return {
    async getItem(key: string): Promise<string | null> {
      return window.localStorage.getItem(key);
    },
    async setItem(key: string, value: string): Promise<void> {
      window.localStorage.setItem(key, value);
    },
    async removeItem(key: string): Promise<void> {
      window.localStorage.removeItem(key);
    },
  };
}

function createNativeBackend(useSecure: boolean): StorageBackend {
  if (useSecure) {
    return {
      async getItem(key: string): Promise<string | null> {
        return SecureStore.getItemAsync(key);
      },
      async setItem(key: string, value: string): Promise<void> {
        await SecureStore.setItemAsync(key, value);
      },
      async removeItem(key: string): Promise<void> {
        await SecureStore.deleteItemAsync(key);
      },
    };
  }
  return {
    async getItem(key: string): Promise<string | null> {
      return AsyncStorage.getItem(key);
    },
    async setItem(key: string, value: string): Promise<void> {
      await AsyncStorage.setItem(key, value);
    },
    async removeItem(key: string): Promise<void> {
      await AsyncStorage.removeItem(key);
    },
  };
}

const webBackend = createWebBackend();
const secureNativeBackend = createNativeBackend(true);
const asyncNativeBackend = createNativeBackend(false);

function getBackend(key: string): StorageBackend {
  if (isWeb) return webBackend;
  return secureKeys.has(key) ? secureNativeBackend : asyncNativeBackend;
}

export const storageService = {
  async getItem<T = string>(key: StorageKey): Promise<T | null> {
    try {
      const raw = await getBackend(key).getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch (error) {
      logger.warn('getItem failed for', key, error);
      return null;
    }
  },

  async setItem<T>(key: StorageKey, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await getBackend(key).setItem(key, serialized);
    } catch (error) {
      logger.warn('setItem failed for', key, error);
      throw error;
    }
  },

  async removeItem(key: StorageKey): Promise<void> {
    try {
      await getBackend(key).removeItem(key);
    } catch (error) {
      logger.warn('removeItem failed for', key, error);
      throw error;
    }
  },

  async clearAll(): Promise<void> {
    const keys = Object.values(StorageKeys);
    await Promise.all(keys.map((key) => this.removeItem(key)));
  },
};
