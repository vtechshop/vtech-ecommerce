import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import { ROLES } from '../../src/utils/constants';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, fontWeight, letterSpacing } from '../../src/theme';

export default function AdminLayout() {
  const { isReady } = useAuthGuard([ROLES.ADMIN]);

  if (!isReady) return <LoadingScreen />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: fontWeight.bold, letterSpacing: letterSpacing.tight },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Panel' }} />
      <Stack.Screen name="users" options={{ title: 'Users Management' }} />
      <Stack.Screen name="products" options={{ title: 'Products Management' }} />
      <Stack.Screen name="orders" options={{ title: 'Orders Management' }} />
      <Stack.Screen name="vendors" options={{ title: 'Vendors Management' }} />
      <Stack.Screen name="affiliates" options={{ title: 'Affiliates Management' }} />
    </Stack>
  );
}
