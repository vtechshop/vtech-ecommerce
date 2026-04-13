import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Product } from '../../types';
import { colors, borderRadius, spacing, fontSize, fontWeight, letterSpacing, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;

interface ProductCardProps {
  product: Product;
  onWishlist?: () => void;
  isWishlisted?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProductCard({ product, onWishlist, isWishlisted }: ProductCardProps) {
  const scale = useSharedValue(1);
  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
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
  title: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold, marginBottom: spacing.xs, minHeight: 36, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: 2 },
  rating: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text },
  reviewCount: { fontSize: fontSize.xs, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: letterSpacing.tight },
  compareAt: { fontSize: fontSize.sm, color: colors.textSecondary, textDecorationLine: 'line-through' },
});
