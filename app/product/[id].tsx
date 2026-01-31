import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/api/products';
import { userApi } from '../../src/api/user';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';
import { Product, Review } from '../../src/types';
import Button from '../../src/components/ui/Button';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      productsApi.getById(id),
      productsApi.getReviews(id, { limit: 5 }),
    ]).then(([prodRes, revRes]) => {
      setProduct(prodRes.data.data);
      setReviews(revRes.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    dispatch(addToCart({ productId: product._id, quantity }));
    Alert.alert('Added to Cart', `${product.title} added to your cart`);
  };

  const handleWishlist = async () => {
    if (!product || !isAuthenticated) return;
    try {
      if (isWishlisted) {
        await userApi.removeFromWishlist(product._id);
      } else {
        await userApi.addToWishlist(product._id);
      }
      setIsWishlisted(!isWishlisted);
    } catch {}
  };

  if (loading || !product) return <LoadingScreen />;

  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image Carousel */}
        <FlatList
          data={product.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.image} contentFit="cover" />
          )}
        />
        <View style={styles.dots}>
          {product.images.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{product.title}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons key={star} name={star <= product.rating ? 'star' : 'star-outline'} size={18} color={colors.secondary} />
            ))}
            <Text style={styles.ratingText}>{product.rating.toFixed(1)} ({product.reviewCount} reviews)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
            {product.compareAt && (
              <>
                <Text style={styles.compareAt}>₹{product.compareAt.toLocaleString()}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discount}% OFF</Text>
                </View>
              </>
            )}
          </View>

          {/* Stock */}
          <Text style={[styles.stock, product.stock > 0 ? { color: colors.success } : { color: colors.error }]}>
            {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
          </Text>

          {/* Quantity */}
          <View style={styles.qtySection}>
            <Text style={styles.qtyLabel}>Quantity:</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => quantity > 1 && setQuantity(quantity - 1)}>
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => quantity < product.stock && setQuantity(quantity + 1)}>
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Reviews */}
          {reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Reviews ({product.reviewCount})</Text>
              {reviews.map((review) => (
                <View key={review._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.userId?.name || 'User'}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={14} color={colors.secondary} />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  {review.verifiedPurchase && (
                    <Text style={styles.verified}>Verified Purchase</Text>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.wishlistButton} onPress={handleWishlist}>
          <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={24} color={isWishlisted ? colors.error : colors.text} />
        </TouchableOpacity>
        <Button
          title={product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          onPress={handleAddToCart}
          disabled={product.stock === 0}
          size="lg"
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  image: { width, height: width },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginHorizontal: 4 },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  info: { padding: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 2 },
  ratingText: { marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  price: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
  compareAt: { fontSize: fontSize.lg, color: colors.textSecondary, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: colors.success, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  discountText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },
  stock: { fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm },
  qtySection: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  qtyLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  qtyBtn: { width: 36, height: 36, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  qtyValue: { fontSize: fontSize.lg, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 24 },
  reviewCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  reviewStars: { flexDirection: 'row' },
  reviewComment: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  verified: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600', marginTop: spacing.xs },
  bottomBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
    alignItems: 'center',
  },
  wishlistButton: { width: 48, height: 48, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
});
