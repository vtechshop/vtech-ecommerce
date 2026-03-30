import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/api/products';
import { Product } from '../../src/types';
import AnimatedProductCard from '../../src/components/product/AnimatedProductCard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing } from '../../src/theme';

const PAGE_LIMIT = 20;

const SORT_OPTIONS = [
  { label: 'Relevance', value: '' },
  { label: 'Price: Low', value: 'price' },
  { label: 'Price: High', value: '-price' },
  { label: 'Newest', value: '-createdAt' },
  { label: 'Rating', value: '-rating' },
];

export default function ProductListScreen() {
  const params = useLocalSearchParams<{ category?: string; search?: string; q?: string; sort?: string; featured?: string; title?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.search || params.q || '');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeSort, setActiveSort] = useState(params.sort || '');
  // For category: cache all items from backend, sort+paginate client-side
  const allCategoryItems = useRef<Product[]>([]);

  const navigation = useNavigation();

  useEffect(() => {
    if (params.title) navigation.setOptions({ title: params.title });
    else if (params.featured === 'true') navigation.setOptions({ title: 'Featured Products' });
  }, [params.title, params.featured]);

  const sortItems = (items: Product[], sort: string): Product[] => {
    const sorted = [...items];
    switch (sort) {
      case 'price':      return sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case '-price':     return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case '-rating':    return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case '-createdAt': return sorted.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      default:           return sorted;
    }
  };

  const loadProducts = async (pageNum: number = 1, search?: string, sort?: string) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    const resolvedSort = sort !== undefined ? sort : (activeSort || params.sort || '');
    try {
      if (params.category) {
        // Fetch all items once (page 1), cache them, then sort+paginate client-side
        if (pageNum === 1) {
          const { data } = await productsApi.getCategoryProducts(params.category);
          allCategoryItems.current = data.data?.items || [];
        }
        const sorted = sortItems(allCategoryItems.current, resolvedSort);
        const start = (pageNum - 1) * PAGE_LIMIT;
        const slice = sorted.slice(start, start + PAGE_LIMIT);
        if (pageNum === 1) setProducts(slice);
        else setProducts((prev) => [...prev, ...slice]);
        setHasMore(start + PAGE_LIMIT < allCategoryItems.current.length);
      } else {
        const { data } = await productsApi.getAll({
          q: search || params.search || undefined,
          sort: resolvedSort || undefined,
          featured: params.featured === 'true' ? true : undefined,
          page: pageNum,
          limit: PAGE_LIMIT,
        });
        const newProducts = data.data || [];
        if (pageNum === 1) setProducts(newProducts);
        else setProducts((prev) => [...prev, ...newProducts]);
        setHasMore(newProducts.length >= PAGE_LIMIT);
      }
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
  }, [params.category, params.sort, params.featured]);

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

      {/* Results count + Sort */}
      {!loading && products.length > 0 && (
        <View style={styles.resultsRow}>
          <Text style={styles.resultCount}>{products.length} product{products.length !== 1 ? 's' : ''}{hasMore ? '+' : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.md }}>
            {SORT_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.sortChip, activeSort === s.value && styles.sortChipActive]}
                onPress={() => {
                  setActiveSort(s.value);
                  setPage(1);
                  setHasMore(true);
                  setProducts([]);
                  if (params.category) {
                    // Re-sort cached items instantly, no network call
                    const sorted = sortItems(allCategoryItems.current, s.value);
                    setProducts(sorted.slice(0, PAGE_LIMIT));
                    setHasMore(PAGE_LIMIT < allCategoryItems.current.length);
                  } else {
                    loadProducts(1, searchQuery || undefined, s.value);
                  }
                }}
              >
                <Text style={[styles.sortChipText, activeSort === s.value && styles.sortChipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>Try a different search or browse categories</Text>
          <TouchableOpacity onPress={() => { setSearchQuery(''); loadProducts(1, ''); }} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          columnWrapperStyle={styles.row}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          renderItem={({ item, index }) => <AnimatedProductCard product={item} index={index} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.sm,
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
  resultsRow: {
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  resultCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    fontWeight: fontWeight.medium,
  },
  sortChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  sortChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLightest,
  },
  sortChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  sortChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
  emptyTitle: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  clearBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryLighter,
  },
  clearBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
