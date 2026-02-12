import React, { useEffect } from 'react';
import { StyleSheet, Pressable, View, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Product } from '../../types';
import { colors, borderRadius, spacing, fontSize, fontWeight, letterSpacing, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;

interface AnimatedProductCardProps {
  product: Product;
  index?: number;
  onWishlist?: () => void;
  isWishlisted?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedProductCard({ product, index = 0, onWishlist, isWishlisted }: AnimatedProductCardProps) {
  const scale = useSharedValue(1);
  const entryOpacity = useSharedValue(0);
  const entryTranslateY = useSharedValue(40);

  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  useEffect(() => {
    const delay = index * 100;
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    entryTranslateY.value = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryTranslateY.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  return (
    <Animated.View style={[entryStyle, { width: CARD_WIDTH, marginBottom: spacing.md }]}>
      <AnimatedPressable
        style={[styles.card, pressStyle]}
        onPress={() => router.push(`/product/${product._id}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={styles.imageContainer}>
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={32} color={colors.border} />
            </View>
          )}
          {discount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{discount}% OFF</Text>
            </View>
          )}
          {onWishlist && (
            <Pressable style={styles.wishlistBtn} onPress={onWishlist}>
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={isWishlisted ? colors.error : colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.secondary} />
            <Text style={styles.rating}>{(product.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({product.reviewCount ?? 0})</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{(product.price ?? 0).toLocaleString()}</Text>
            {product.compareAt && (
              <Text style={styles.compareAt}>₹{(product.compareAt ?? 0).toLocaleString()}</Text>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: CARD_WIDTH * 1.1 },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  wishlistBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.xs + 2,
    ...shadows.sm,
  },
  info: { padding: spacing.md - 2 },
  title: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: 2 },
  rating: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text },
  reviewCount: { fontSize: fontSize.xs, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: letterSpacing.tight },
  compareAt: { fontSize: fontSize.sm, color: colors.textSecondary, textDecorationLine: 'line-through' },
});
