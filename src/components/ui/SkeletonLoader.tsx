import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../theme';

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({ width, height, borderRadius = 8, style }: SkeletonLoaderProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]);
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceDark,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonBanner() {
  return <SkeletonLoader width="100%" height={180} borderRadius={24} style={{ marginBottom: 16 }} />;
}

export function SkeletonCategoryRow() {
  return (
    <Animated.View style={skeletonStyles.categoryRow}>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={skeletonStyles.categoryItem}>
          <SkeletonLoader width={56} height={56} borderRadius={12} />
          <SkeletonLoader width={50} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export function SkeletonProductGrid() {
  return (
    <Animated.View style={skeletonStyles.productGrid}>
      {[0, 1].map((i) => (
        <Animated.View key={i} style={skeletonStyles.productCard}>
          <SkeletonLoader width="100%" height={160} borderRadius={16} />
          <SkeletonLoader width="80%" height={12} borderRadius={4} style={{ marginTop: 10 }} />
          <SkeletonLoader width="50%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          <SkeletonLoader width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export function SkeletonProductList() {
  const pairs = [0, 1, 2, 3];
  return (
    <Animated.View style={{ padding: 16, gap: 16 }}>
      {pairs.map((i) => (
        <Animated.View key={i} style={skeletonStyles.productGrid}>
          {[0, 1].map((j) => (
            <Animated.View key={j} style={skeletonStyles.productCard}>
              <SkeletonLoader width="100%" height={160} borderRadius={16} />
              <SkeletonLoader width="85%" height={12} borderRadius={4} style={{ marginTop: 10 }} />
              <SkeletonLoader width="55%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
              <SkeletonLoader width="42%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
            </Animated.View>
          ))}
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export function SkeletonProductDetail() {
  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
      {/* Image */}
      <SkeletonLoader width="100%" height={320} borderRadius={0} />
      {/* Content card */}
      <Animated.View style={{ margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 20, gap: 12 }}>
        <SkeletonLoader width="75%" height={14} borderRadius={4} />
        <SkeletonLoader width="90%" height={20} borderRadius={4} />
        <SkeletonLoader width="60%" height={20} borderRadius={4} />
        <Animated.View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <SkeletonLoader width={80} height={28} borderRadius={20} />
          <SkeletonLoader width={100} height={28} borderRadius={20} />
        </Animated.View>
        <SkeletonLoader width="100%" height={1} borderRadius={0} style={{ marginVertical: 4 }} />
        <SkeletonLoader width="40%" height={12} borderRadius={4} />
        <SkeletonLoader width="95%" height={12} borderRadius={4} />
        <SkeletonLoader width="80%" height={12} borderRadius={4} />
        <SkeletonLoader width="65%" height={12} borderRadius={4} />
      </Animated.View>
      {/* Add to cart button skeleton */}
      <Animated.View style={{ marginHorizontal: 16 }}>
        <SkeletonLoader width="100%" height={52} borderRadius={16} />
      </Animated.View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  categoryRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  categoryItem: { alignItems: 'center' },
  productGrid: { flexDirection: 'row', gap: 16 },
  productCard: { flex: 1 },
});
