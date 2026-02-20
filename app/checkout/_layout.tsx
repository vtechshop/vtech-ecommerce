import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, fontWeight } from '../../src/theme';

export default function CheckoutLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Checkout', headerBackTitle: 'Cart' }} />
    </Stack>
  );
}
