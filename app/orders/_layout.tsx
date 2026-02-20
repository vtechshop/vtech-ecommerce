import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, fontWeight } from '../../src/theme';

export default function OrdersLayout() {
  const { isReady } = useAuthGuard();

  if (!isReady) return <LoadingScreen />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: fontWeight.bold },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Orders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order Details' }} />
      <Stack.Screen name="addresses" options={{ title: 'My Addresses' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="loyalty" options={{ title: 'Loyalty Points' }} />
      <Stack.Screen name="tickets" options={{ title: 'Support Tickets' }} />
      <Stack.Screen name="ticket/[id]" options={{ title: 'Ticket' }} />
    </Stack>
  );
}
