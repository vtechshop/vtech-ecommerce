import { Stack } from 'expo-router';
import { colors, fontWeight, letterSpacing } from '../../src/theme';

export default function PagesLayout() {
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
      <Stack.Screen name="blog" options={{ title: 'Blog' }} />
      <Stack.Screen name="about" options={{ title: 'About Us' }} />
      <Stack.Screen name="contact" options={{ title: 'Contact Us' }} />
      <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="return-policy" options={{ title: 'Return Policy' }} />
      <Stack.Screen name="gift-cards" options={{ title: 'Gift Cards' }} />
      <Stack.Screen name="compare" options={{ title: 'Compare Products' }} />
      <Stack.Screen name="coupons" options={{ title: 'Your Coupons' }} />
      <Stack.Screen name="festival-sale" options={{ title: 'Festival Sale' }} />
      <Stack.Screen name="referral" options={{ title: 'Refer & Earn' }} />
    </Stack>
  );
}
