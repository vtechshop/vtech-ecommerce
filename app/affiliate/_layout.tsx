import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import { ROLES } from '../../src/utils/constants';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, fontWeight } from '../../src/theme';

export default function AffiliateLayout() {
  const { isReady } = useAuthGuard([ROLES.AFFILIATE, ROLES.ADMIN]);

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
      <Stack.Screen name="index" options={{ title: 'Affiliate Dashboard' }} />
      <Stack.Screen name="links" options={{ title: 'My Links' }} />
      <Stack.Screen name="commissions" options={{ title: 'Commissions' }} />
      <Stack.Screen name="payouts" options={{ title: 'Payouts' }} />
      <Stack.Screen name="kyc" options={{ title: 'KYC Verification' }} />
    </Stack>
  );
}
