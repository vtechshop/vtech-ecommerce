import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import { Product } from '../../src/types';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

export default function AdminProducts() {
  const { isReady } = useAuthGuard([ROLES.ADMIN]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async (searchQuery?: string) => {
    setError(null);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      const { data } = await adminApi.getProducts(params);
      setProducts(data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(search); setRefreshing(false); };
  const handleSearch = () => { setLoading(true); loadData(search); };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminApi.deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p._id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  if (!isReady || loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={60} color={colors.border} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
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
                <Text style={styles.productMeta}>Stock: {item.stock ?? 0} | Rating: {(item.rating ?? 0).toFixed(1)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item._id, item.title)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
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
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, margin: spacing.md, marginBottom: 0, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 2, paddingLeft: spacing.sm, fontSize: fontSize.md, color: colors.text },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 60, height: 60, borderRadius: borderRadius.sm },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  productTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  productPrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginTop: 2 },
  productMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: spacing.sm },
});
