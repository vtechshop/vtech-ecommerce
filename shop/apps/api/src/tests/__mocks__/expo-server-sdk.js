// Minimal CJS stub for expo-server-sdk.
// The real package ships as native ESM which Jest's CommonJS transform cannot
// parse.  This stub provides the exact surface used by expoPushService.js:
//   - Expo class with chunkPushNotifications() and sendPushNotificationsAsync()
//   - Expo.isExpoPushToken() static method
'use strict';

class Expo {
  chunkPushNotifications(notifications) {
    return [notifications];
  }

  async sendPushNotificationsAsync(chunk) {
    return chunk.map(() => ({ status: 'ok', id: 'mock-ticket-id' }));
  }
}

Expo.isExpoPushToken = (token) =>
  typeof token === 'string' && token.startsWith('ExponentPushToken');

module.exports = { Expo };
