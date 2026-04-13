import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../api/client';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and return the Expo push token.
 * Returns null if permission denied or not on a physical device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulators/emulators don't support push

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'V-Tech Kitchen',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
      sound: 'default',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch {
    return null;
  }
}

/**
 * Register push token with backend. Call after user logs in.
 */
export async function savePushTokenToBackend(token: string): Promise<void> {
  try {
    await api.put('/user/push-token', { token });
  } catch {
    // Silently fail — push is non-critical
  }
}

/**
 * Remove push token from backend. Call on logout.
 */
export async function removePushTokenFromBackend(token: string): Promise<void> {
  try {
    await api.delete('/user/push-token', { data: { token } });
  } catch {}
}
