import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store, useAppDispatch } from '../src/store';
import { loadUser } from '../src/store/slices/authSlice';
import { colors } from '../src/theme';

function RootLayoutInner() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="product/list" options={{ title: 'Products' }} />
        <Stack.Screen name="product/search" options={{ title: 'Search' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout', headerBackTitle: 'Cart' }} />
        <Stack.Screen name="orders" options={{ title: 'My Orders' }} />
        <Stack.Screen name="vendor" options={{ title: 'Vendor Dashboard' }} />
        <Stack.Screen name="affiliate" options={{ title: 'Affiliate Dashboard' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin Panel' }} />
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
