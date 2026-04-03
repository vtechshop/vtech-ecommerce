import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { bannersApi, Banner } from '../../api/content';
import { colors, spacing, fontSize, borderRadius, fontWeight, gradients } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH;
const BANNER_HEIGHT = 220;
const AUTO_SCROLL_INTERVAL = 4000;

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  gradient?: readonly [string, string, ...string[]];
}

// Fallback banners shown when API returns empty or fails
const FALLBACK_BANNERS: BannerItem[] = [
  { id: 'f1', title: 'Welcome to V-Tech', subtitle: 'Discover amazing products at best prices', icon: 'sparkles', gradient: gradients.primary },
  { id: 'f2', title: 'Free Shipping', subtitle: 'On orders above ₹999', icon: 'airplane', gradient: gradients.info },
  { id: 'f3', title: 'Hot Deals', subtitle: 'Up to 50% off on trending items', icon: 'flame', gradient: gradients.sunset },
  { id: 'f4', title: 'Earn Rewards', subtitle: 'Collect loyalty points on every purchase', icon: 'star', gradient: gradients.purple },
];

function mapApiBanners(apiBanners: Banner[]): BannerItem[] {
  return apiBanners.map((b) => ({
    id: b._id,
    title: b.title,
    subtitle: b.subtitle || '',
    image: b.image,
  }));
}

export default function HomeBanner() {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [banners, setBanners] = useState<BannerItem[]>(FALLBACK_BANNERS);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    bannersApi.getAll()
      .then((res) => {
        if (res.data.data && res.data.data.length > 0) {
          setBanners(mapApiBanners(res.data.data));
        }
      })
      .catch(() => {
        // Keep fallback banners on error
      });
  }, []);

  const startAutoScroll = useCallback(() => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      setBanners((currentBanners) => {
        setActiveIndex((prev) => {
          const next = (prev + 1) % currentBanners.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
        return currentBanners;
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
    <View style={styles.banner}>
      {item.image ? (
        <>
          <Image
            source={{ uri: item.image }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />
        </>
      ) : (
        <LinearGradient
          colors={item.gradient || gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {/* Only show text overlay for fallback banners (no image) */}
      {!item.image && (
        <View style={styles.bannerContent}>
          {item.icon && (
            <View style={styles.bannerIconCircle}>
              <Ionicons name={item.icon} size={28} color={colors.white} />
            </View>
          )}
          <Text style={styles.bannerTitle}>{item.title}</Text>
          <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
        </View>
      )}
      {!item.image && item.icon && (
        <View style={styles.bannerDecoration}>
          <Ionicons name={item.icon} size={120} color="rgba(255,255,255,0.08)" />
        </View>
      )}
    </View>
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
        onScrollToIndexFailed={() => {}}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH,
          offset: BANNER_WIDTH * index,
          index,
        })}
      />
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
    marginBottom: spacing.sm,
  },
  banner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    zIndex: 1,
  },
  bannerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  bannerSubtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.9)',
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
