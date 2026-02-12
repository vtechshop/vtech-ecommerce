import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/api/products';
import { Product } from '../../src/types';
import ProductCard from '../../src/components/product/ProductCard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing } from '../../src/theme';

const PAGE_LIMIT = 20;

export default function ProductListScreen() {
  const params = useLocalSearchParams<{ category?: string; search?: string; sort?: string; featured?: string; title?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const navigation = useNavigation();

  useEffect(() => {
    if (params.title) navigation.setOptions({ title: params.title });
    else if (params.featured === 'true') navigation.setOptions({ title: 'Featured Products' });
  }, [params.title, params.featured]);

  const loadProducts = async (pageNum: number = 1, search?: string) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const { data } = await productsApi.getAll({
        category: params.category,
        search: search || params.search,
        sort: params.sort,
        featured: params.featured === 'true' ? true : undefined,
        page: pageNum,
        limit: PAGE_LIMIT,
      });
      const newProducts = data.data || [];
      if (pageNum === 1) {
        setProducts(newProducts);
      } else {
        setProducts((prev) => [...prev, ...newProducts]);
      }
      setHasMore(newProducts.length >= PAGE_LIMIT);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadProducts(1);
  }, [params.category, params.sort]);

  const handleSearch = () => {
    setPage(1);
    setHasMore(true);
    loadProducts(1, searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadProducts(page + 1, searchQuery || undefined);
    }
  };

  const renderFooter = () => {
    if (!hasMore && products.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>All products loaded</Text>
        </View>
      );
    }
    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); loadProducts(1, ''); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {params.title && <Text style={styles.title}>{params.title}</Text>}

      {/* Results count */}
      {!loading && products.length > 0 && (
        <Text style={styles.resultCount}>{products.length} product{products.length !== 1 ? 's' : ''}{hasMore ? '+' : ''}</Text>
      )}

      {loading ? (
        <LoadingScreen />
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity onPress={() => loadProducts(1)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="search-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          columnWrapperStyle={styles.row}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
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
    backgroundColor: colors.white,
    margin: spacing.md,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xxl,
    borderWidth: 1.5,
    borderColor: colors.primaryLighter,
    gap: spacing.sm,
    ...shadows.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    letterSpacing: letterSpacing.tight,
  },
  resultCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  row: { justifyContent: 'space-between' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontWeight: fontWeight.medium,
  },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
