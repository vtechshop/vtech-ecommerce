import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { productsApi } from '../../src/api/products';
import { Product, Category } from '../../src/types';
import AnimatedProductCard from '../../src/components/product/AnimatedProductCard';
import SectionHeader from '../../src/components/ui/SectionHeader';
import HomeBanner from '../../src/components/ui/HomeBanner';
import AnimatedSection from '../../src/components/ui/AnimatedSection';
import CountdownTimer from '../../src/components/ui/CountdownTimer';
import { SkeletonBanner, SkeletonCategoryRow, SkeletonProductGrid } from '../../src/components/ui/SkeletonLoader';
import { useRecentlyViewed } from '../../src/hooks/useRecentlyViewed';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, gradients } from '../../src/theme';

const { width } = Dimensions.get('window');

const categoryColors = [colors.primaryLightest, colors.warningLight, colors.successLight, colors.infoLight, colors.errorLight];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getFlashSaleEndTime() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

function AnimatedSearchBar() {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.searchBar, animStyle]}
      onPress={() => router.push('/product/search' as any)}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 200 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
    >
      <Ionicons name="search" size={20} color={colors.primary} />
      <Text style={styles.searchText}>Search products...</Text>
    </AnimatedPressable>
  );
}

const quickActions = [
  { icon: 'flash' as const, label: 'Deals', gradient: gradients.sunset, params: { sort: '-discount', title: 'Hot Deals' } },
  { icon: 'trending-up' as const, label: 'Trending', gradient: gradients.info, params: { sort: '-reviewCount', title: 'Trending' } },
  { icon: 'star' as const, label: 'Top Rated', gradient: gradients.secondary, params: { sort: '-rating', title: 'Top Rated' } },
  { icon: 'cube' as const, label: 'New In', gradient: gradients.success, params: { sort: '-createdAt', title: 'New Arrivals' } },
];

function QuickActionBtn({ action }: { action: typeof quickActions[number] }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.quickAction, animStyle]}
      onPress={() => router.push({ pathname: '/product/list' as any, params: action.params })}
      onPressIn={() => { scale.value = withSpring(0.9, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      <LinearGradient colors={action.gradient as any} style={styles.quickIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={action.icon} size={22} color={colors.white} />
      </LinearGradient>
      <Text style={styles.quickLabel}>{action.label}</Text>
    </AnimatedPressable>
  );
}

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

      // Find deals (products with compareAt > price)
      const allProducts = [...(featuredRes.data.data || []), ...(newRes.data.data || [])];
      const unique = new Map<string, Product>();
      allProducts.forEach((p) => { if (p.compareAt && p.compareAt > p.price) unique.set(p._id, p); });
      const dealProducts = [...unique.values()]
        .sort((a, b) => {
          const discA = ((a.compareAt! - a.price) / a.compareAt!) * 100;
          const discB = ((b.compareAt! - b.price) / b.compareAt!) * 100;
          return discB - discA;
        })
        .slice(0, 6);
      setDeals(dealProducts);

      setError(null);
      retryCountRef.current = 0;
    } catch (e: any) {
      const isTimeout = e.code === 'ECONNABORTED';
      const isNetworkError = e.message?.includes('Network') || e.message?.includes('timeout');
      const status = e.response?.status;

      if ((isTimeout || isNetworkError) && retryCountRef.current < 2) {
        retryCountRef.current += 1;
        setError(`Server is waking up... Retrying (${retryCountRef.current}/2)`);
        setTimeout(() => loadData(true), 3000);
        return;
      }

      const msg = isTimeout
        ? 'Server is taking too long. Tap to retry.'
        : isNetworkError
          ? 'Cannot reach server. Check your connection or try again.'
          : status === 500
            ? 'Server error. Please try again later.'
            : `Failed to load. ${e.response?.data?.message || 'Tap to retry.'}`;
      setError(msg);
      retryCountRef.current = 0;
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
        <SkeletonBanner />
        <SkeletonCategoryRow />
        <SkeletonProductGrid />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <AnimatedSearchBar />

      <AnimatedSection delay={0}>
        <HomeBanner />
      </AnimatedSection>

      {/* Trust Badges */}
      <AnimatedSection delay={50} style={{ paddingHorizontal: spacing.sm, marginBottom: spacing.md }}>
        <View style={styles.trustStrip}>
          {([
            { icon: 'car-outline' as const, label: 'Free\nDelivery', clr: '#10B981' },
            { icon: 'shield-checkmark-outline' as const, label: 'Genuine\nProducts', clr: '#6366F1' },
            { icon: 'arrow-undo-outline' as const, label: 'Easy\nReturns', clr: '#F59E0B' },
            { icon: 'lock-closed-outline' as const, label: 'Secure\nPayment', clr: '#3B82F6' },
          ]).map((b) => (
            <View key={b.label} style={styles.trustBadge}>
              <View style={[styles.trustIconCircle, { backgroundColor: b.clr + '15' }]}>
                <Ionicons name={b.icon} size={18} color={b.clr} />
              </View>
              <Text style={styles.trustLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </AnimatedSection>

      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => { setLoading(true); loadData(); }}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.white} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryHint}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <AnimatedSection delay={100} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <QuickActionBtn key={action.label} action={action} />
          ))}
        </View>
      </AnimatedSection>

      {/* Categories */}
      {categories.length > 0 && (
        <AnimatedSection delay={200} style={styles.section}>
          <SectionHeader title="Categories" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {categories.map((item, index) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.categoryCard, { backgroundColor: categoryColors[index % categoryColors.length] }]}
                onPress={() => router.push({ pathname: '/product/list' as any, params: { category: item._id, title: item.name } })}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.categoryImage} />
                ) : (
                  <View style={[styles.categoryImage, styles.categoryPlaceholder]}>
                    <Ionicons name="grid-outline" size={24} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AnimatedSection>
      )}

      {/* Flash Deals */}
      {deals.length > 0 && (
        <AnimatedSection delay={300} style={styles.section}>
          <View style={styles.dealHeader}>
            <View>
              <View style={styles.dealTitleRow}>
                <Ionicons name="flash" size={20} color={colors.error} />
                <Text style={styles.dealTitle}>Flash Deals</Text>
              </View>
              <View style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: colors.error, marginTop: 4 }} />
            </View>
            <CountdownTimer endTime={getFlashSaleEndTime()} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {deals.map((item, index) => (
              <View key={`deal-${item._id}`} style={{ marginRight: spacing.md }}>
                <AnimatedProductCard product={item} index={index} />
              </View>
            ))}
          </ScrollView>
        </AnimatedSection>
      )}

      {/* Featured */}
      <AnimatedSection delay={400} style={styles.section}>
        <SectionHeader
          title="Featured"
          actionText="View All"
          onAction={() => router.push({ pathname: '/product/list' as any, params: { featured: 'true' } })}
        />
        {featured.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {featured.slice(0, 6).map((item, index) => (
              <View key={item._id} style={{ marginRight: spacing.md }}>
                <AnimatedProductCard product={item} index={index} />
              </View>
            ))}
          </ScrollView>
        ) : !loading && !error ? (
          <View style={styles.emptySection}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="sparkles-outline" size={28} color={colors.primaryLight} />
            </View>
            <Text style={styles.emptySectionText}>No featured products yet</Text>
          </View>
        ) : null}
      </AnimatedSection>

      {/* Trending */}
      {trending.length > 0 && (
        <AnimatedSection delay={500} style={styles.section}>
          <SectionHeader
            title="Trending Now"
            actionText="View All"
            onAction={() => router.push({ pathname: '/product/list' as any, params: { sort: '-reviewCount', title: 'Trending' } })}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {trending.slice(0, 6).map((item, index) => (
              <View key={`trend-${item._id}`} style={{ marginRight: spacing.md }}>
                <AnimatedProductCard product={item} index={index} />
              </View>
            ))}
          </ScrollView>
        </AnimatedSection>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <AnimatedSection delay={600} style={styles.section}>
          <SectionHeader title="Recently Viewed" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {recentlyViewed.slice(0, 8).map((item) => (
              <TouchableOpacity
                key={`rv-${item._id}`}
                style={styles.recentCard}
                onPress={() => router.push(`/product/${item._id}`)}
              >
                {item.images?.[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.recentImage} contentFit="cover" />
                ) : (
                  <View style={[styles.recentImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={20} color={colors.border} />
                  </View>
                )}
                <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.recentPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AnimatedSection>
      )}

      {/* New Arrivals */}
      <AnimatedSection delay={700} style={styles.section}>
        <SectionHeader
          title="New Arrivals"
          actionText="View All"
          onAction={() => router.push({ pathname: '/product/list' as any, params: { sort: '-createdAt' } })}
        />
        {newArrivals.length > 0 ? (
          <View style={styles.productGrid}>
            {newArrivals.map((product, index) => (
              <AnimatedProductCard key={product._id} product={product} index={index} />
            ))}
          </View>
        ) : !loading && !error ? (
          <View style={styles.emptySection}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cube-outline" size={28} color={colors.primaryLight} />
            </View>
            <Text style={styles.emptySectionText}>No products yet</Text>
          </View>
        ) : null}
      </AnimatedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.md,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.xxl,
    borderWidth: 1.5,
    borderColor: colors.primaryLighter,
    gap: spacing.sm,
    ...shadows.md,
  },
  searchText: { color: colors.textSecondary, fontSize: fontSize.md },
  errorBanner: {
    backgroundColor: colors.error,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    ...shadows.md,
  },
  errorText: { color: colors.white, fontSize: fontSize.sm, flex: 1 },
  retryHint: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textDecorationLine: 'underline' },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', width: (width - spacing.md * 2 - spacing.md * 3) / 4 },
  quickIconBg: { width: 52, height: 52, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.xs, textAlign: 'center' },
  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  categoryCard: { alignItems: 'center', marginRight: spacing.md, width: 88, padding: spacing.sm, borderRadius: borderRadius.xl },
  categoryImage: { width: 56, height: 56, borderRadius: borderRadius.lg, backgroundColor: colors.white },
  categoryPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  categoryName: { fontSize: fontSize.xs, color: colors.text, marginTop: spacing.xs, textAlign: 'center', fontWeight: fontWeight.semibold },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  dealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dealTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  recentCard: { width: 120, marginRight: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.sm },
  recentImage: { width: '100%', height: 100 },
  recentTitle: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium, padding: spacing.xs + 2, paddingBottom: 0 },
  recentPrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, padding: spacing.xs + 2, paddingTop: spacing.xs },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptySection: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  emptySectionText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  // Trust badges
  trustStrip: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.white, borderRadius: borderRadius.xl, paddingVertical: spacing.sm + 2, marginHorizontal: spacing.xs, ...shadows.sm },
  trustBadge: { alignItems: 'center', flex: 1 },
  trustIconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  trustLabel: { fontSize: 9, color: colors.textSecondary, fontWeight: fontWeight.semibold, textAlign: 'center', marginTop: 3, lineHeight: 12 },
});
