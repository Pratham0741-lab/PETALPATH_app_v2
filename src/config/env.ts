import { Platform } from 'react-native';

/**
 * Centered configuration for API and assets host url.
 * During local development, this points to your computer's local IP or localhost.
 * When deploying to production, replace BACKEND_URL with your online hosted server URL
 * (e.g. 'https://petalpath-api.onrender.com').
 */
export const BACKEND_URL = Platform.OS === 'android'
  ? 'http://localhost:5000' // Directs to PC's localhost via 'adb reverse tcp:5000 tcp:5000'
  : 'http://localhost:5000';

export const API_URL = `${BACKEND_URL}/api`;
