import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Product } from '../../types';
import { colors, borderRadius, spacing, fontSize } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;

interface ProductCardProps {
  product: Product;
  onWishlist?: () => void;
  isWishlisted?: boolean;
}

export default function ProductCard({ product, onWishlist, isWishlisted }: ProductCardProps) {
  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${product._id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images[0] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {discount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{discount}% OFF</Text>
          </View>
        )}
        {onWishlist && (
          <TouchableOpacity style={styles.wishlistBtn} onPress={onWishlist}>
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={isWishlisted ? colors.error : colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={colors.secondary} />
          <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({product.reviewCount})</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
          {product.compareAt && (
            <Text style={styles.compareAt}>₹{product.compareAt.toLocaleString()}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: CARD_WIDTH * 1.1 },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },
  wishlistBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    elevation: 2,
  },
  info: { padding: spacing.sm },
  title: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500', marginBottom: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: 2 },
  rating: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text },
  reviewCount: { fontSize: fontSize.xs, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  compareAt: { fontSize: fontSize.sm, color: colors.textSecondary, textDecorationLine: 'line-through' },
});
