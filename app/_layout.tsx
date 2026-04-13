import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { store, useAppDispatch, useAppSelector } from '../src/store';
import { loadUser } from '../src/store/slices/authSlice';
import { useFirstLaunch } from '../src/hooks/useFirstLaunch';
import { useKeepAlive } from '../src/hooks/useKeepAlive';
import { ToastProvider } from '../src/components/ui/Toast';
import { registerForPushNotificationsAsync, savePushTokenToBackend } from '../src/services/pushNotifications';
import { colors, fontWeight } from '../src/theme';

SplashScreen.preventAutoHideAsync();

// Error boundary to catch and display crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: `${error.name}: ${error.message}\n${error.stack?.slice(0, 500)}` };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>APP CRASH CAUGHT</Text>
          <Text style={ebStyles.error}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#DC2626', marginBottom: 16 },
  error: { fontSize: 12, color: '#991B1B', fontFamily: 'monospace' },
});

function RootLayoutInner() {
  const dispatch = useAppDispatch();
  const { isFirstLaunch } = useFirstLaunch();
  const { isLoading: authLoading, isAuthenticated } = useAppSelector((s) => s.auth);
  const notifListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useKeepAlive();

  useEffect(() => {
    dispatch(loadUser());
  }, []);

  // Register push token after authentication
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushTokenToBackend(token);
    });

    // Handle notification taps (deep link to order screen)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.screen === 'order' && data?.orderId) {
        router.push(`/orders/${data.orderId}` as any);
      } else if (data?.screen === 'product' && data?.productId) {
        router.push(`/product/${data.productId}` as any);
      }
    });

    return () => {
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [isAuthenticated]);

  // Hide splash screen once both auth check and first launch check are done
  const isReady = isFirstLaunch !== null && !authLoading;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: fontWeight.bold },
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
        initialRouteName={isFirstLaunch ? 'onboarding' : '(tabs)'}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="product" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="checkout" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="orders" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="vendor" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="affiliate" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="admin" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="pages" options={{ headerShown: false, animation: 'fade_from_bottom' }} />
        <Stack.Screen name="chatbot" options={{ title: 'V-Tech Assistant', headerTintColor: colors.primary, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="gamification" options={{ headerShown: false, animation: 'fade_from_bottom' }} />
        <Stack.Screen name="deals" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <ToastProvider>
              <RootLayoutInner />
            </ToastProvider>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
