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
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Product } from '../../types';
import { haptic } from '../../utils/haptics';
import { colors, borderRadius, spacing, fontSize, fontWeight, shadows } from '../../theme';

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
  const entryTranslateY = useSharedValue(30);
  const heartScale = useSharedValue(1);
  const badgeScale = useSharedValue(1);

  const discount = product.compareAt && product.compareAt > product.price
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  const isOutOfStock = product.stock !== undefined && product.stock === 0;
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;

  useEffect(() => {
    const delay = Math.min(index * 60, 400);
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    entryTranslateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    if (discount >= 30) {
      badgeScale.value = withDelay(delay + 500, withRepeat(
        withSequence(
          withTiming(1.08, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ), -1, true
      ));
    }
  }, []);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryTranslateY.value }],
  }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));

  const handleWishlistPress = () => {
    haptic.light();
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    onWishlist?.();
  };

  return (
    <Animated.View style={[entryStyle, { width: CARD_WIDTH, marginBottom: spacing.md }]}>
      <AnimatedPressable
        style={[styles.card, pressStyle, isOutOfStock && styles.cardOutOfStock]}
        onPress={() => router.push(`/product/${product._id}`)}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          {product.images?.[0] ? (
            <Image source={{ uri: product.images[0] }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={36} color={colors.border} />
            </View>
          )}

          {/* Discount badge */}
          {discount > 0 && !isOutOfStock && (
            <Animated.View style={[styles.discountBadge, badgeStyle]}>
              <Text style={styles.discountText}>{discount}%</Text>
              <Text style={styles.discountOff}>OFF</Text>
            </Animated.View>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockOverlayText}>Out of Stock</Text>
            </View>
          )}

          {/* Wishlist button */}
          {onWishlist && (
            <Pressable style={styles.wishlistBtn} onPress={handleWishlistPress}>
              <Animated.View style={heartStyle}>
                <Ionicons
                  name={isWishlisted ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isWishlisted ? colors.error : colors.textSecondary}
                />
              </Animated.View>
            </Pressable>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{product.title}</Text>

          {/* Rating */}
          {(product.reviewCount ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingNum}>{(product.rating ?? 0).toFixed(1)}</Text>
                <Ionicons name="star" size={10} color={colors.white} />
              </View>
              <Text style={styles.reviewCount}>({product.reviewCount ?? 0})</Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{(product.price ?? 0).toLocaleString()}</Text>
          </View>
          {product.compareAt && product.compareAt > product.price && (
            <View style={styles.compareRow}>
              <Text style={styles.compareAt}>₹{product.compareAt.toLocaleString()}</Text>
              {discount > 0 && <Text style={styles.savingText}>Save ₹{(product.compareAt - product.price).toLocaleString()}</Text>}
            </View>
          )}

          {/* Stock status */}
          {isLowStock && <Text style={styles.lowStock}>Only {product.stock} left!</Text>}
          {isOutOfStock && <Text style={styles.outOfStock}>Out of Stock</Text>}
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
  cardOutOfStock: { opacity: 0.75 },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: CARD_WIDTH * 1.15 },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },

  discountBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: '#e53935',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  discountText: { color: colors.white, fontSize: 12, fontWeight: fontWeight.extrabold, lineHeight: 14 },
  discountOff: { color: '#ffcdd2', fontSize: 8, fontWeight: fontWeight.bold, lineHeight: 10 },

  outOfStockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  outOfStockOverlayText: { color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  wishlistBtn: {
    position: 'absolute', top: spacing.xs, right: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.full, padding: spacing.xs,
    ...shadows.sm,
  },

  info: { padding: spacing.sm },
  title: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium, marginBottom: spacing.xs, lineHeight: 18 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: 4 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#388e3c', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, gap: 2 },
  ratingNum: { fontSize: 10, color: colors.white, fontWeight: fontWeight.bold },
  reviewCount: { fontSize: fontSize.xs, color: colors.textSecondary },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, color: colors.text },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  compareAt: { fontSize: fontSize.xs, color: colors.textSecondary, textDecorationLine: 'line-through' },
  savingText: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold },

  lowStock: { fontSize: fontSize.xs, color: '#e53935', fontWeight: fontWeight.semibold, marginTop: 2 },
  outOfStock: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium, marginTop: 2 },
});
