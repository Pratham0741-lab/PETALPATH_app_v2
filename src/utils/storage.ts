import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn('Failed to read from localStorage', e);
      }
    } else {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.warn('Failed to read from AsyncStorage', e);
      }
    }
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn('Failed to write to localStorage', e);
      }
    } else {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.warn('Failed to write to AsyncStorage', e);
      }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to remove from localStorage', e);
      }
    } else {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to remove from AsyncStorage', e);
      }
    }
  },
};
