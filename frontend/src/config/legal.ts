/**
 * The legal pages on the website, opened in the phone's browser.
 *
 * React Native's Linking (system browser) rather than an in-app browser:
 * expo-web-browser is not installed, and adding a native module would need a
 * new build instead of an over-the-air update.
 */
import { Linking } from 'react-native';
import { customAlert } from '../utils/alert';

export const TERMS_URL = 'https://petalpath.co.in/terms';
export const PRIVACY_URL = 'https://petalpath.co.in/privacy';

/** Opens a web page; if the phone cannot, says where to find it instead. */
export async function openExternalPage(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    customAlert("Couldn't open the page", `Please visit ${url} in your browser.`);
  }
}
