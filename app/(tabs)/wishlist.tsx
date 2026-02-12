import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { userApi } from '../../src/api/user';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';
import { Product } from '../../src/types';
import ProductCard from '../../src/components/product/ProductCard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/theme';

type SortOption = 'default' | 'price-low' | 'price-high' | 'name';

export default function WishlistScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const loadWishlist = async () => {
    setError(null);
    try {
      const { data } = await userApi.getWishlist();
      setProducts(data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'Something went wrong'); }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) loadWishlist();
    else setLoading(false);
  }, [isAuthenticated]);

  const removeItem = async (productId: string) => {
    await userApi.removeFromWishlist(productId);
    setProducts((prev) => prev.filter((p) => p._id !== productId));
  };

  const moveToCart = async (product: Product) => {
    if (!isAuthenticated) return;
    const result = await dispatch(addToCart({ productId: product._id, quantity: 1 }));
    if (addToCart.fulfilled.match(result)) {
      await userApi.removeFromWishlist(product._id);
      setProducts((prev) => prev.filter((p) => p._id !== product._id));
      Alert.alert('Moved to Cart', `${product.title} moved to your cart`);
    } else {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    return 0;
  });

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <View style={styles.empty}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.emptyTitle}>{error}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); loadWishlist(); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated || products.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="heart-outline" size={40} color={colors.primaryLight} />
        </View>
        <Text style={styles.emptyTitle}>{isAuthenticated ? 'Your wishlist is empty' : 'Login to view wishlist'}</Text>
        {isAuthenticated && <Text style={styles.emptySubtext}>Save items you love here</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sort Options */}
      <View style={styles.sortRow}>
        <Text style={styles.countText}>{products.length} item{products.length !== 1 ? 's' : ''}</Text>
        <View style={styles.sortChips}>
          {([
            { label: 'Default', value: 'default' as SortOption },
            { label: 'Price ↑', value: 'price-low' as SortOption },
            { label: 'Price ↓', value: 'price-high' as SortOption },
            { label: 'Name', value: 'name' as SortOption },
          ]).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortChip, sortBy === opt.value && styles.sortChipActive]}
              onPress={() => setSortBy(opt.value)}
            >
              <Text style={[styles.sortChipText, sortBy === opt.value && styles.sortChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={sortedProducts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.wishlistCard}>
            <TouchableOpacity style={styles.cardContent} onPress={() => router.push(`/product/${item._id}`)}>
              {item.images?.[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.cardImage} contentFit="cover" />
              ) : (
                <View style={[styles.cardImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={24} color={colors.border} />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.cardRating}>
                  <Ionicons name="star" size={12} color={colors.secondary} />
                  <Text style={styles.ratingText}>{(item.rating ?? 0).toFixed(1)}</Text>
                </View>
                <View style={styles.cardPriceRow}>
                  <Text style={styles.cardPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
                  {item.compareAt && <Text style={styles.cardCompare}>₹{item.compareAt.toLocaleString()}</Text>}
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.moveToCartBtn} onPress={() => moveToCart(item)}>
                <Ionicons name="cart-outline" size={16} color={colors.white} />
                <Text style={styles.moveToCartText}>Move to Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeWishlistBtn} onPress={() => removeItem(item._id)}>
                <Ionicons name="heart-dislike-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  countText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  sortChips: { flexDirection: 'row', gap: spacing.xs },
  sortChip: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  sortChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  sortChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  // Wishlist card
  wishlistCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, marginBottom: spacing.md, overflow: 'hidden', ...shadows.sm },
  cardContent: { flexDirection: 'row', padding: spacing.md },
  cardImage: { width: 80, height: 80, borderRadius: borderRadius.lg },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  cardRating: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
  ratingText: { fontSize: fontSize.xs, color: colors.textSecondary },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  cardPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  cardCompare: { fontSize: fontSize.sm, color: colors.textSecondary, textDecorationLine: 'line-through' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.surfaceDark },
  moveToCartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, backgroundColor: colors.primary },
  moveToCartText: { fontSize: fontSize.sm, color: colors.white, fontWeight: fontWeight.semibold },
  removeWishlistBtn: { paddingHorizontal: spacing.lg, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.errorLight },
  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptySubtext: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
});
