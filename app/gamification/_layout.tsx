import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, fontWeight } from '../../src/theme';

export default function GamificationLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Fun Zone' }} />
      <Stack.Screen name="quiz" options={{ title: 'Daily Quiz' }} />
      <Stack.Screen name="spin" options={{ headerTransparent: true, headerTitle: '', headerShadowVisible: false, headerTintColor: colors.white }} />
    </Stack>
  );
}
