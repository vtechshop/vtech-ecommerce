import { Stack } from 'expo-router';
import { colors, fontWeight, letterSpacing } from '../../src/theme';

export default function GamificationLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Fun Zone' }} />
      <Stack.Screen name="quiz" options={{ title: 'Daily Quiz' }} />
      <Stack.Screen name="spin" options={{ title: 'Spin & Win' }} />
    </Stack>
  );
}
