import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: '753db5d8-d9d6-4d20-a579-39eeb7567c02' })).data;
  return token;
}

export async function scheduleLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // immediate
  });
}

export async function schedulePriceDropAlert(productTitle: string, oldPrice: number, newPrice: number) {
  await scheduleLocalNotification(
    '🏷️ Price Drop Alert!',
    `${productTitle} dropped from ₹${oldPrice.toLocaleString()} to ₹${newPrice.toLocaleString()}!`,
    { type: 'price_drop' }
  );
}

export async function scheduleOrderUpdate(orderId: string, status: string) {
  const messages: Record<string, string> = {
    confirmed: 'Your order has been confirmed!',
    shipped: 'Your order has been shipped!',
    delivered: 'Your order has been delivered!',
  };
  if (messages[status]) {
    await scheduleLocalNotification(
      '📦 Order Update',
      `Order #${orderId}: ${messages[status]}`,
      { type: 'order_update', orderId }
    );
  }
}
