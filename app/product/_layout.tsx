import { Stack } from 'expo-router';
import { colors, fontWeight, letterSpacing } from '../../src/theme';

export default function ProductLayout() {
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
      <Stack.Screen name="[id]" options={{ title: 'Product' }} />
      <Stack.Screen name="list" options={{ title: 'Products' }} />
      <Stack.Screen name="search" options={{ title: 'Search' }} />
    </Stack>
  );
}
