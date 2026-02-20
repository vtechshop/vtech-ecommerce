import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import { ROLES } from '../../src/utils/constants';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, fontWeight } from '../../src/theme';

export default function VendorLayout() {
  const { isReady } = useAuthGuard([ROLES.VENDOR, ROLES.ADMIN]);

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
      <Stack.Screen name="index" options={{ title: 'Vendor Dashboard' }} />
      <Stack.Screen name="products" options={{ title: 'My Products' }} />
      <Stack.Screen name="orders" options={{ title: 'Vendor Orders' }} />
      <Stack.Screen name="settlements" options={{ title: 'Settlements' }} />
      <Stack.Screen name="kyc" options={{ title: 'KYC Verification' }} />
      <Stack.Screen name="razorpay" options={{ title: 'Razorpay Connect' }} />
    </Stack>
  );
}
