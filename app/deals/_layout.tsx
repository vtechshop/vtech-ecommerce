import { Stack } from 'expo-router';
import { colors, fontWeight, letterSpacing } from '../../src/theme';

export default function DealsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Deals & Offers' }} />
    </Stack>
  );
}
