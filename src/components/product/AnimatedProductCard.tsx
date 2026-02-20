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
  const heartScale = useSharedValue(1);
  const badgeScale = useSharedValue(1);

  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  useEffect(() => {
    const delay = index * 100;
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    entryTranslateY.value = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    // Pulse discount badge for big discounts
    if (discount >= 40) {
      badgeScale.value = withDelay(delay + 600, withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ));
    }
  }, []);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryTranslateY.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handleWishlistPress = () => {
    haptic.light();
    heartScale.value = withSequence(
      withSpring(1.5, { damping: 4, stiffness: 400 }),
      withSpring(0.8, { damping: 4, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    onWishlist?.();
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
            <Animated.View style={[styles.badge, badgeStyle]}>
              <Text style={styles.badgeText}>{discount}% OFF</Text>
            </Animated.View>
          )}
          {onWishlist && (
            <Pressable style={styles.wishlistBtn} onPress={handleWishlistPress}>
              <Animated.View style={heartStyle}>
                <Ionicons
                  name={isWishlisted ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isWishlisted ? colors.error : colors.textSecondary}
                />
              </Animated.View>
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
