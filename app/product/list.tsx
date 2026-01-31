import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/api/products';
import { Product } from '../../src/types';
import ProductCard from '../../src/components/product/ProductCard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

export default function ProductListScreen() {
  const params = useLocalSearchParams<{ category?: string; search?: string; sort?: string; featured?: string; title?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(params.search || '');

  const loadProducts = async (search?: string) => {
    setLoading(true);
    try {
      const { data } = await productsApi.getAll({
        category: params.category,
        search: search || params.search,
        sort: params.sort,
      });
      setProducts(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, [params.category, params.sort]);

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => loadProducts(searchQuery)}
          returnKeyType="search"
        />
      </View>

      {params.title && <Text style={styles.title}>{params.title}</Text>}

      {loading ? (
        <LoadingScreen />
      ) : products.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={60} color={colors.border} />
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          columnWrapperStyle={styles.row}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 2, fontSize: fontSize.md, color: colors.text },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.md },
  row: { justifyContent: 'space-between' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
});
