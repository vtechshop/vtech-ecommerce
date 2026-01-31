import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../src/api/user';
import { Product } from '../../src/types';
import ProductCard from '../../src/components/product/ProductCard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { useAppSelector } from '../../src/store';
import { colors, spacing, fontSize } from '../../src/theme';

export default function WishlistScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  const loadWishlist = async () => {
    try {
      const { data } = await userApi.getWishlist();
      setProducts(data.data);
    } catch {}
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

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated || products.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="heart-outline" size={80} color={colors.border} />
        <Text style={styles.emptyTitle}>{isAuthenticated ? 'Your wishlist is empty' : 'Login to view wishlist'}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={products}
      numColumns={2}
      columnWrapperStyle={styles.row}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: spacing.md }}
      renderItem={({ item }) => (
        <ProductCard product={item} isWishlisted onWishlist={() => removeItem(item._id)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: { justifyContent: 'space-between' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
});
