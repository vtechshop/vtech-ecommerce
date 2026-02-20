import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, StatusBar, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useFirstLaunch } from '../src/hooks/useFirstLaunch';
import { colors, spacing, fontSize, fontWeight, borderRadius, gradients } from '../src/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

function AnimatedFeatureItem({ text, index }: { text: string; index: number }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    const delay = 300 + index * 150;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    translateX.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.featureItem, animStyle]}>
      <View style={styles.featureCheck}>
        <Ionicons name="checkmark" size={14} color={colors.white} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
}

function AnimatedDot({ isActive }: { isActive: boolean }) {
  const w = useSharedValue(isActive ? 28 : 8);
  const bg = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    w.value = withSpring(isActive ? 28 : 8, { damping: 15, stiffness: 200 });
    bg.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    width: w.value,
    backgroundColor: bg.value > 0.5 ? colors.primary : colors.border,
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export default function OnboardingScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { completeOnboarding } = useFirstLaunch();
  const iconScale = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(100, withSpring(1.15, { damping: 8, stiffness: 200 })),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
  }, [currentIndex]);

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

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <LinearGradient colors={item.gradient} style={styles.gradientTop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Animated.View style={[styles.iconCircle, iconAnimStyle]}>
          <Ionicons name={item.icon} size={64} color={colors.white} />
        </Animated.View>
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
            <AnimatedFeatureItem key={idx} text={feature} index={idx} />
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
            <AnimatedDot key={idx} isActive={currentIndex === idx} />
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {isLastSlide ? (
            <AnimatedPressable
              style={styles.getStartedBtn}
              onPress={handleGetStarted}
            >
              <LinearGradient colors={gradients.primary} style={styles.getStartedGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </LinearGradient>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              style={styles.nextBtn}
              onPress={handleNext}
            >
              <LinearGradient colors={gradients.primary} style={styles.nextGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="arrow-forward" size={22} color={colors.white} />
              </LinearGradient>
            </AnimatedPressable>
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
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.border },
  actionsRow: { alignItems: 'center' },
  nextBtn: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  getStartedBtn: { width: '100%', borderRadius: borderRadius.xl, overflow: 'hidden' },
  getStartedGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md + 2 },
  getStartedText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white },
});
