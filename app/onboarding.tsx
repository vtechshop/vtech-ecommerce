import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFirstLaunch } from '../src/hooks/useFirstLaunch';
import { colors, spacing, fontSize, fontWeight, borderRadius, gradients } from '../src/theme';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  gradient: readonly [string, string, ...string[]];
  features: string[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'bag-handle',
    title: 'Welcome to V-Tech',
    subtitle: 'Your one-stop marketplace for amazing products from trusted vendors',
    gradient: gradients.primary,
    features: ['Thousands of products', 'Verified sellers', 'Best prices guaranteed'],
  },
  {
    id: '2',
    icon: 'flash',
    title: 'Flash Deals & Offers',
    subtitle: 'Never miss a deal with real-time flash sales and exclusive discounts',
    gradient: ['#F97316', '#EF4444'] as unknown as readonly [string, string, ...string[]],
    features: ['Daily flash deals', 'Coupon codes', 'Loyalty rewards program'],
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    title: 'Secure & Fast Delivery',
    subtitle: 'Safe payments, real-time tracking, and quick delivery to your doorstep',
    gradient: ['#10B981', '#059669'] as unknown as readonly [string, string, ...string[]],
    features: ['Secure checkout', 'Live order tracking', 'Easy returns & refunds'],
  },
  {
    id: '4',
    icon: 'people',
    title: 'Join the Community',
    subtitle: 'Rate products, earn loyalty points, and become a vendor or affiliate',
    gradient: ['#8B5CF6', '#6D28D9'] as unknown as readonly [string, string, ...string[]],
    features: ['Write reviews', 'Earn loyalty points', 'Become a vendor'],
  },
];

export default function OnboardingScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { completeOnboarding } = useFirstLaunch();

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    router.replace('/(tabs)' as any);
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(tabs)' as any);
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <LinearGradient colors={item.gradient} style={styles.gradientTop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon} size={64} color={colors.white} />
        </View>
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
      </LinearGradient>

      <View style={styles.contentArea}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>

        <View style={styles.featuresList}>
          {item.features.map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color={colors.white} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        renderItem={renderSlide}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Bottom area */}
      <View style={styles.bottomArea}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentIndex === idx && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {isLastSlide ? (
            <TouchableOpacity style={styles.getStartedBtn} onPress={handleGetStarted} activeOpacity={0.8}>
              <LinearGradient colors={gradients.primary} style={styles.getStartedGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
              <LinearGradient colors={gradients.primary} style={styles.nextGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="arrow-forward" size={22} color={colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  slide: { width, flex: 1 },
  gradientTop: {
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  decorCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  decorCircle1: { width: 200, height: 200, top: -40, right: -60 },
  decorCircle2: { width: 150, height: 150, bottom: -30, left: -40 },
  decorCircle3: { width: 100, height: 100, top: 60, left: 30 },
  contentArea: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  title: { fontSize: 28, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  featuresList: { marginTop: spacing.xl, gap: spacing.md },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  // Skip
  skipBtn: { position: 'absolute', top: 50, right: spacing.lg, zIndex: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  skipText: { fontSize: fontSize.md, color: colors.white, fontWeight: fontWeight.semibold },
  // Bottom
  bottomArea: { paddingBottom: 40, paddingHorizontal: spacing.xl },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 28, backgroundColor: colors.primary },
  actionsRow: { alignItems: 'center' },
  nextBtn: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  getStartedBtn: { width: '100%', borderRadius: borderRadius.xl, overflow: 'hidden' },
  getStartedGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md + 2 },
  getStartedText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white },
});
