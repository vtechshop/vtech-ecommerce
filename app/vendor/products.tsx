import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vendorApi } from '../../src/api/vendor';
import { Product } from '../../src/types';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const PAGE_LIMIT = 20;

export default function VendorProducts() {
  const { isReady } = useAuthGuard([ROLES.VENDOR, ROLES.ADMIN]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = async (pageNum: number = 1) => {
    if (pageNum === 1) setError(null);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const { data } = await vendorApi.getProducts({ page: pageNum, limit: PAGE_LIMIT });
      const items = data.data || [];
      if (pageNum === 1) setProducts(items);
      else setProducts((prev) => [...prev, ...items]);
      setHasMore(items.length >= PAGE_LIMIT);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load data');
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);

  const onRefresh = async () => { setRefreshing(true); setHasMore(true); await loadData(1); setRefreshing(false); };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) loadData(page + 1);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await vendorApi.deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p._id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  if (!isReady || loading) return <LoadingScreen />;

  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
      <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
      <Text style={{ fontSize: fontSize.md, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>{error}</Text>
      <TouchableOpacity onPress={loadData} style={{ marginTop: spacing.md, padding: spacing.sm }}>
        <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '600' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (products.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cube-outline" size={80} color={colors.border} />
        <Text style={styles.emptyTitle}>No products yet</Text>
        <Text style={styles.emptyText}>Your products will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: spacing.md }}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.footerText}>Loading more...</Text></View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            {item.images?.[0] ? (
              <Image source={{ uri: item.images[0] }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={24} color={colors.border} />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.productPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
              <Text style={styles.productStock}>Stock: {item.stock ?? 0}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id, item.title)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 60, height: 60, borderRadius: borderRadius.sm },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  productTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  productPrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginTop: 2 },
  productStock: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
