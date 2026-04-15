import { Stack } from 'expo-router';
import { colors, fontWeight } from '../../src/theme';

const transparentHeader = {
  headerTransparent: true,
  headerTitle: '' as const,
  headerShadowVisible: false,
  headerTintColor: colors.white,
};

export default function PagesLayout() {
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
      <Stack.Screen name="blog" options={{ title: 'Blog' }} />
      <Stack.Screen name="about" options={transparentHeader} />
      <Stack.Screen name="contact" options={transparentHeader} />
      <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="return-policy" options={{ title: 'Return Policy' }} />
<Stack.Screen name="coupons" options={transparentHeader} />
      <Stack.Screen name="festival-sale" options={transparentHeader} />
      <Stack.Screen name="referral" options={transparentHeader} />
    </Stack>
  );
}
