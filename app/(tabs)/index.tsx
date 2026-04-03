import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { productsApi } from '../../src/api/products';
import { Product, Category } from '../../src/types';
import AnimatedProductCard from '../../src/components/product/AnimatedProductCard';
import HomeBanner from '../../src/components/ui/HomeBanner';
import AnimatedSection from '../../src/components/ui/AnimatedSection';
import CountdownTimer from '../../src/components/ui/CountdownTimer';
import { SkeletonBanner, SkeletonCategoryRow, SkeletonProductGrid } from '../../src/components/ui/SkeletonLoader';
import { useRecentlyViewed } from '../../src/hooks/useRecentlyViewed';
import { useAppSelector } from '../../src/store';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const { width } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getFlashSaleEndTime() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

function HomeHeader() {
  const cartCount = useAppSelector((s) => s.cart.cart?.items.length ?? 0);
  return (
    <LinearGradient colors={['#1a1a6e', '#2d2d9f']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <View style={styles.headerTop}>
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>V-Tech</Text>
          <Text style={styles.logoSub}>Kitchen</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/product/search' as any)}>
            <Ionicons name="search-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/(tabs)/cart' as any)}>
            <Ionicons name="cart-outline" size={24} color={colors.white} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Ionicons name="person-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Search bar in header */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/product/search' as any)} activeOpacity={0.9}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <Text style={styles.searchText}>Search for kitchen products...</Text>
        <Ionicons name="mic-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const quickCategories = [
  { icon: 'flash' as const, label: 'Deals', color: '#ff6b35', params: { sort: '-discount', title: 'Hot Deals' } },
  { icon: 'trending-up' as const, label: 'Trending', color: '#4caf50', params: { sort: '-reviewCount', title: 'Trending' } },
  { icon: 'star' as const, label: 'Top Rated', color: '#ff9800', params: { sort: '-rating', title: 'Top Rated' } },
  { icon: 'cube' as const, label: 'New', color: '#2196f3', params: { sort: '-createdAt', title: 'New Arrivals' } },
  { icon: 'gift' as const, label: 'Offers', color: '#e91e63', params: { sort: '-discount', title: 'Best Offers' } },
];

export default function HomeScreen() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { items: recentlyViewed } = useRecentlyViewed();
  const retryCountRef = React.useRef(0);

  const loadData = async (isAutoRetry = false) => {
    if (!isAutoRetry) setError(null);
    try {
      const [featuredRes, catRes, newRes, trendRes] = await Promise.all([
        productsApi.getFeatured(),
        productsApi.getCategories(),
        productsApi.getAll({ sort: '-createdAt', limit: 10 }),
        productsApi.getRecommendations().catch(() => ({ data: { data: [] } })),
      ]);
      setFeatured(featuredRes.data.data || []);
      setCategories(catRes.data.data || []);
      setNewArrivals(newRes.data.data || []);
      setTrending((trendRes as any).data.data || []);

      const allProducts = [...(featuredRes.data.data || []), ...(newRes.data.data || [])];
      const unique = new Map<string, Product>();
      allProducts.forEach((p) => { if (p.compareAt && p.compareAt > p.price) unique.set(p._id, p); });
      setDeals([...unique.values()].sort((a, b) => {
        const dA = ((a.compareAt! - a.price) / a.compareAt!) * 100;
        const dB = ((b.compareAt! - b.price) / b.compareAt!) * 100;
        return dB - dA;
      }).slice(0, 8));

      setError(null);
      retryCountRef.current = 0;
    } catch (e: any) {
      const isTimeout = e.code === 'ECONNABORTED';
      const isNetworkError = e.message?.includes('Network') || e.message?.includes('timeout');

      if ((isTimeout || isNetworkError) && retryCountRef.current < 2) {
        retryCountRef.current += 1;
        setError(`Server is waking up... (${retryCountRef.current}/2)`);
        setTimeout(() => loadData(true), 3000);
        return;
      }

      setError(isTimeout ? 'Server taking too long. Tap to retry.' : `Failed to load. Tap to retry.`);
      retryCountRef.current = 0;
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) {
    return (
      <View style={styles.container}>
        <HomeHeader />
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <SkeletonBanner />
          <SkeletonCategoryRow />
          <SkeletonProductGrid />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HomeHeader />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Error banner */}
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={() => { setLoading(true); loadData(); }}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.white} />
            <Text style={styles.errorText}>{error} — Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* Quick category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {quickCategories.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={[styles.quickPill, { backgroundColor: q.color + '15', borderColor: q.color + '40' }]}
              onPress={() => router.push({ pathname: '/product/list' as any, params: q.params })}
            >
              <Ionicons name={q.icon} size={16} color={q.color} />
              <Text style={[styles.quickPillText, { color: q.color }]}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Main Banner — no fade animation, must be full opacity immediately */}
        <HomeBanner />

        {/* Trust Strip */}
        <AnimatedSection delay={50} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
          <View style={styles.trustStrip}>
            {[
              { icon: 'car-outline' as const, label: 'Free Delivery', sub: 'On orders ₹999+', color: colors.success },
              { icon: 'shield-checkmark-outline' as const, label: '100% Genuine', sub: 'Verified products', color: colors.primary },
              { icon: 'arrow-undo-outline' as const, label: 'Easy Returns', sub: '7-day policy', color: colors.warning },
              { icon: 'lock-closed-outline' as const, label: 'Secure Pay', sub: 'Encrypted', color: colors.info },
            ].map((b) => (
              <View key={b.label} style={styles.trustBadge}>
                <View style={[styles.trustIcon, { backgroundColor: b.color + '15' }]}>
                  <Ionicons name={b.icon} size={20} color={b.color} />
                </View>
                <Text style={styles.trustLabel}>{b.label}</Text>
                <Text style={styles.trustSub}>{b.sub}</Text>
              </View>
            ))}
          </View>
        </AnimatedSection>

        {/* Categories */}
        {categories.length > 0 && (
          <AnimatedSection delay={100} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/categories' as any)}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {categories.map((cat, i) => (
                <TouchableOpacity
                  key={cat._id}
                  style={styles.catCard}
                  onPress={() => router.push({ pathname: '/product/list' as any, params: { category: cat.slug || cat._id, title: cat.name } })}
                >
                  {cat.image ? (
                    <Image source={{ uri: cat.image }} style={styles.catImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.catImage, { backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="grid-outline" size={28} color={colors.primary} />
                    </View>
                  )}
                  <Text style={styles.catName} numberOfLines={2}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </AnimatedSection>
        )}

        {/* Flash Deals */}
        {deals.length > 0 && (
          <AnimatedSection delay={150} style={styles.dealSection}>
            <LinearGradient colors={['#ff6b35', '#ff4500']} style={styles.dealHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.dealLeft}>
                <Ionicons name="flash" size={22} color={colors.white} />
                <Text style={styles.dealTitle}>Flash Deals</Text>
              </View>
              <CountdownTimer endTime={getFlashSaleEndTime()} />
            </LinearGradient>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md }}>
              {deals.map((item, index) => (
                <AnimatedProductCard key={`deal-${item._id}`} product={item} index={index} />
              ))}
            </ScrollView>
          </AnimatedSection>
        )}

        {/* Featured Products */}
        {featured.length > 0 && (
          <AnimatedSection delay={200} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/product/list' as any, params: { featured: 'true' } })}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {featured.slice(0, 6).map((item, index) => (
                <AnimatedProductCard key={item._id} product={item} index={index} />
              ))}
            </ScrollView>
          </AnimatedSection>
        )}

        {/* Trending */}
        {trending.length > 0 && (
          <AnimatedSection delay={250} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/product/list' as any, params: { sort: '-reviewCount', title: 'Trending' } })}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {trending.slice(0, 6).map((item, index) => (
                <AnimatedProductCard key={`trend-${item._id}`} product={item} index={index} />
              ))}
            </ScrollView>
          </AnimatedSection>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <AnimatedSection delay={300} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {recentlyViewed.slice(0, 8).map((item) => (
                <TouchableOpacity
                  key={`rv-${item._id}`}
                  style={styles.recentCard}
                  onPress={() => router.push(`/product/${item._id}`)}
                >
                  {item.images?.[0] ? (
                    <Image source={{ uri: item.images[0] }} style={styles.recentImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.recentImg, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="image-outline" size={20} color={colors.border} />
                    </View>
                  )}
                  <View style={{ padding: spacing.xs + 2 }}>
                    <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.recentPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </AnimatedSection>
        )}

        {/* New Arrivals grid */}
        <AnimatedSection delay={350} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/product/list' as any, params: { sort: '-createdAt' } })}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {newArrivals.length > 0 ? (
            <View style={styles.productGrid}>
              {newArrivals.map((product, index) => (
                <AnimatedProductCard key={product._id} product={product} index={index} />
              ))}
            </View>
          ) : null}
        </AnimatedSection>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scroll: { flex: 1 },

  // Header
  header: { paddingTop: 44, paddingBottom: spacing.md, paddingHorizontal: spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  logoArea: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoText: { fontSize: 22, fontWeight: fontWeight.extrabold, color: colors.white, letterSpacing: -0.5 },
  logoSub: { fontSize: 13, color: '#ffd700', fontWeight: fontWeight.bold },
  headerIcons: { flexDirection: 'row', gap: spacing.sm },
  headerIcon: { padding: spacing.xs, position: 'relative' },
  cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ffd700', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  cartBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, color: '#1a1a6e' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, gap: spacing.sm },
  searchText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },

  // Quick pills
  quickScroll: { paddingVertical: spacing.sm },
  quickPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, borderWidth: 1 },
  quickPillText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  // Error
  errorBanner: { backgroundColor: colors.error, margin: spacing.md, borderRadius: borderRadius.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorText: { color: colors.white, fontSize: fontSize.sm, flex: 1 },

  // Trust
  trustStrip: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.xl, paddingVertical: spacing.md, ...shadows.sm },
  trustBadge: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
  trustIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  trustLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' },
  trustSub: { fontSize: 9, color: colors.textSecondary, textAlign: 'center', marginTop: 1 },

  // Section
  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  seeAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },

  // Category
  catCard: { alignItems: 'center', width: 88 },
  catImage: { width: 70, height: 70, borderRadius: borderRadius.xl, marginBottom: spacing.xs },
  catName: { fontSize: fontSize.xs, color: colors.text, textAlign: 'center', fontWeight: fontWeight.medium },

  // Flash Deal section
  dealSection: { marginBottom: spacing.lg, backgroundColor: colors.white, ...shadows.sm },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  dealLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dealTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.white },

  // Recently viewed
  recentCard: { width: 130, backgroundColor: colors.white, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.sm },
  recentImg: { width: '100%', height: 110 },
  recentTitle: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium, lineHeight: 16 },
  recentPrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, marginTop: 2 },

  // Product grid
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
