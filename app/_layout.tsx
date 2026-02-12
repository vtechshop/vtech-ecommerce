import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store, useAppDispatch } from '../src/store';
import { loadUser } from '../src/store/slices/authSlice';
import { useFirstLaunch } from '../src/hooks/useFirstLaunch';
import { colors, fontWeight, letterSpacing } from '../src/theme';

function RootLayoutInner() {
  const dispatch = useAppDispatch();
  const { isFirstLaunch } = useFirstLaunch();

  useEffect(() => {
    dispatch(loadUser());
  }, []);

  // Wait for first launch check
  if (isFirstLaunch === null) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: fontWeight.bold, letterSpacing: letterSpacing.tight },
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
        initialRouteName={isFirstLaunch ? 'onboarding' : '(tabs)'}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="product" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="vendor" options={{ headerShown: false }} />
        <Stack.Screen name="affiliate" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="pages" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutInner />
    </Provider>
  );
}
