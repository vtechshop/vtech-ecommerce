import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Share, Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { adminApi } from '../../src/api/admin';
import { useToast } from '../../src/components/ui/Toast';
import { haptic } from '../../src/utils/haptics';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const BASE_URL = 'https://www.vtechkitchen.com';
const PAGE_SIZE = 20;

interface CatalogProduct {
  _id: string;
  title: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: string[];
}

export default function ShareCatalogScreen() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async (pageNum: number, term: string, replace = false) => {
    try {
      const { data } = await adminApi.getProducts({ page: pageNum, limit: PAGE_SIZE, search: term || undefined, status: 'published' } as any);
      const list: CatalogProduct[] = data.data || [];
      const total = (data as any).meta?.total || list.length;
      setProducts((prev) => replace ? list : [...prev, ...list]);
      setHasMore(pageNum * PAGE_SIZE < total);
    } catch {
      showToast('error', 'Error', 'Failed to load products');
    }
  };

  const loadInitial = async (term = searchTerm) => {
    setLoading(true);
    setPage(1);
    await fetchProducts(1, term, true);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadInitial(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    await fetchProducts(next, searchTerm, false);
    setPage(next);
    setLoadingMore(false);
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
    loadInitial(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    loadInitial('');
  };

  const getUrl = (slug: string) => `${BASE_URL}/product/${slug}`;

  const handleCopy = async (product: CatalogProduct) => {
    haptic.light();
    await Clipboard.setStringAsync(getUrl(product.slug));
    showToast('success', 'Link Copied', product.title);
  };

  const handleWhatsApp = (product: CatalogProduct) => {
    haptic.medium();
    const price = (product.salePrice || product.price).toLocaleString('en-IN');
    const url = getUrl(product.slug);
    const message = `Hi! Check out this product on VTech Kitchen:\n\n*${product.title}*\nPrice: ₹${price}\n\n${url}`;
    const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(waUrl).then((supported) => {
      if (supported) {
        Linking.openURL(waUrl);
      } else {
        // Fallback to native share sheet
        Share.share({ message, title: product.title });
      }
    });
  };

  const handleShare = async (product: CatalogProduct) => {
    haptic.light();
    const price = (product.salePrice || product.price).toLocaleString('en-IN');
    await Share.share({
      message: `Check out *${product.title}* on VTech Kitchen — ₹${price}\n${getUrl(product.slug)}`,
      title: product.title,
      url: getUrl(product.slug),
    });
  };

  const renderProduct = ({ item }: { item: CatalogProduct }) => {
    const price = item.salePrice || item.price;
    const hasDiscount = item.salePrice && item.salePrice < item.price;

    return (
      <View style={styles.card}>
        {/* Image */}
        <View style={styles.imageWrap}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={28} color={colors.border} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{price.toLocaleString('en-IN')}</Text>
            {hasDiscount && (
              <Text style={styles.mrp}>₹{item.price.toLocaleString('en-IN')}</Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(item)}>
            <Ionicons name="copy-outline" size={14} color={colors.text} />
            <Text style={styles.copyText}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.waBtn} onPress={() => handleWhatsApp(item)}>
            <Ionicons name="logo-whatsapp" size={14} color={colors.white} />
            <Text style={styles.waText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(item)}>
            <Ionicons name="share-social-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={colors.border} />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#f9fafb',
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  searchBtn: {
    backgroundColor: '#25D366',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
  },
  searchBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl + 32 },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  imageWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surface },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },

  info: { padding: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, lineHeight: 20, marginBottom: spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.success },
  mrp: { fontSize: fontSize.xs, color: colors.textSecondary, textDecorationLine: 'line-through' },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.lg,
  },
  copyText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text },
  waBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: '#25D366',
    borderRadius: borderRadius.lg,
  },
  waText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.white },
  shareBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLightest,
    borderRadius: borderRadius.lg,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
});
