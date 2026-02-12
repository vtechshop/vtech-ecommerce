import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, fontWeight, gradients } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const BANNER_HEIGHT = 180;
const AUTO_SCROLL_INTERVAL = 4000;

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly string[];
}

const banners: BannerItem[] = [
  {
    id: '1',
    title: 'Welcome to V-Tech',
    subtitle: 'Discover amazing products at best prices',
    icon: 'sparkles',
    gradient: gradients.primary,
  },
  {
    id: '2',
    title: 'Free Shipping',
    subtitle: 'On orders above ₹999',
    icon: 'airplane',
    gradient: gradients.info,
  },
  {
    id: '3',
    title: 'Hot Deals',
    subtitle: 'Up to 50% off on trending items',
    icon: 'flame',
    gradient: gradients.sunset,
  },
  {
    id: '4',
    title: 'Earn Rewards',
    subtitle: 'Collect loyalty points on every purchase',
    icon: 'star',
    gradient: gradients.purple,
  },
];

export default function HomeBanner() {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoScroll = useCallback(() => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % banners.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [startAutoScroll]);

  const onScrollBeginDrag = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
  };

  const onScrollEndDrag = () => {
    startAutoScroll();
  };

  const onMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
    setActiveIndex(index);
  };

  const renderBanner = ({ item }: { item: BannerItem }) => (
    <LinearGradient
      colors={item.gradient as string[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      <View style={styles.bannerContent}>
        <View style={styles.bannerIconCircle}>
          <Ionicons name={item.icon} size={28} color={colors.white} />
        </View>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.bannerDecoration}>
        <Ionicons name={item.icon} size={120} color="rgba(255,255,255,0.08)" />
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderBanner}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH,
          offset: BANNER_WIDTH * index,
          index,
        })}
      />
      {/* Dot Indicators */}
      <View style={styles.dots}>
        {banners.map((_, index) => (
          <DotIndicator key={index} active={index === activeIndex} />
        ))}
      </View>
    </View>
  );
}

function DotIndicator({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 24 : 8);
  const opacity = useSharedValue(active ? 1 : 0.4);

  useEffect(() => {
    width.value = withTiming(active ? 24 : 8, { duration: 300 });
    opacity.value = withTiming(active ? 1 : 0.4, { duration: 300 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.dot, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  banner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 1,
  },
  bannerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bannerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  bannerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: fontWeight.medium,
  },
  bannerDecoration: {
    position: 'absolute',
    right: -20,
    bottom: -20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
