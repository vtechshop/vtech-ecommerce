import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, gradients } from '../../src/theme';
import { productsApi } from '../../src/api/products';
import { Product } from '../../src/types';
import { useAppDispatch } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';
import { appConfigApi } from '../../src/api/content';

const { width } = Dimensions.get('window');
const STRIP_CARD_WIDTH = width * 0.42;

// Fallback: Sale ends 7 days from now
const DEFAULT_SALE_END = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

interface CategoryStrip {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  searchQuery: string;
  gradientColors: readonly [string, string, ...string[]];
}

const FALLBACK_STRIPS: CategoryStrip[] = [
  {
    key: 'electronics',
    title: 'Electronics',
    icon: 'laptop-outline',
    searchQuery: 'electronics',
    gradientColors: gradients.info,
  },
  {
    key: 'fashion',
    title: 'Fashion',
    icon: 'shirt-outline',
    searchQuery: 'fashion',
    gradientColors: gradients.purple,
  },
  {
    key: 'home',
    title: 'Home',
    icon: 'home-outline',
    searchQuery: 'home',
    gradientColors: gradients.sunset,
  },
];

const GRADIENT_MAP: Record<string, readonly [string, string, ...string[]]> = {
  info: gradients.info,
  purple: gradients.purple,
  sunset: gradients.sunset,
  primary: gradients.primary,
};

function formatCountdownUnit(value: number): string {
  return String(value).padStart(2, '0');
}

function getDiscount(product: Product): number {
  if (!product.compareAt || product.compareAt <= product.price) return 0;
  return Math.round(((product.compareAt - product.price) / product.compareAt) * 100);
}

export default function FestivalSaleScreen() {
  const dispatch = useAppDispatch();
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saleTitle, setSaleTitle] = useState('Festival Sale');
  const [saleEndDate, setSaleEndDate] = useState(DEFAULT_SALE_END);
  const [categoryStrips, setCategoryStrips] = useState<CategoryStrip[]>(FALLBACK_STRIPS);

  // Fetch festival sale config from admin
  useEffect(() => {
    appConfigApi.get()
      .then((res) => {
        const config = res.data.data?.festivalSale;
        if (config?.isActive) {
          if (config.title) setSaleTitle(config.title);
          if (config.endDate) setSaleEndDate(new Date(config.endDate));
          if (config.categories && config.categories.length > 0) {
            setCategoryStrips(config.categories.map((c) => ({
              key: c.name.toLowerCase().replace(/\s/g, '-'),
              title: c.name,
              icon: (c.icon || 'pricetag-outline') as keyof typeof Ionicons.glyphMap,
              searchQuery: c.searchQuery,
              gradientColors: GRADIENT_MAP[c.gradient?.[0] || 'info'] || gradients.info,
            })));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Fetch products for each category strip
  useEffect(() => {
    categoryStrips.forEach(async (strip) => {
      setLoadingCategories((prev) => ({ ...prev, [strip.key]: true }));
      try {
        const response = await productsApi.search(strip.searchQuery);
        const data = response?.data?.data || [];
        setCategoryProducts((prev) => ({
          ...prev,
          [strip.key]: Array.isArray(data) ? data : [],
        }));
      } catch (error) {
        setCategoryProducts((prev) => ({ ...prev, [strip.key]: [] }));
      } finally {
        setLoadingCategories((prev) => ({ ...prev, [strip.key]: false }));
      }
    });
  }, [categoryStrips]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      dispatch(addToCart({ productId: product._id, quantity: 1 }));
    },
    [dispatch],
  );

  // Calculate countdown
  const remaining = saleEndDate.getTime() - now;
  const days = Math.max(0, Math.floor(remaining / (24 * 60 * 60 * 1000)));
  const hours = Math.max(0, Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
  const minutes = Math.max(0, Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000)));
  const seconds = Math.max(0, Math.floor((remaining % (60 * 1000)) / 1000));

  const renderStripProduct = (product: Product) => {
    const discount = getDiscount(product);

    return (
      <Pressable
        key={product._id}
        style={styles.stripCard}
        onPress={() => router.push(`/product/${product._id}`)}
      >
        <View style={styles.stripImageContainer}>
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.stripImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.stripImage, styles.stripImagePlaceholder]}>
              <Ionicons name="image-outline" size={28} color={colors.border} />
            </View>
          )}
          {discount > 0 && (
            <View style={styles.stripDiscountBadge}>
              <Text style={styles.stripDiscountText}>{discount}%</Text>
              <Text style={styles.stripDiscountLabel}>OFF</Text>
            </View>
          )}
        </View>
        <View style={styles.stripCardInfo}>
          <Text style={styles.stripCardTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.stripPriceRow}>
            <Text style={styles.stripPrice}>
              ₹{(product.price ?? 0).toLocaleString()}
            </Text>
            {product.compareAt ? (
              <Text style={styles.stripComparePrice}>
                ₹{(product.compareAt ?? 0).toLocaleString()}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.stripCartBtn}
            onPress={() => handleAddToCart(product)}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={14} color={colors.white} />
            <Text style={styles.stripCartBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Banner */}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        {/* Decorative elements */}
        <View style={styles.heroDecoCircle1} />
        <View style={styles.heroDecoCircle2} />

        <View style={styles.heroContent}>
          <View style={styles.heroIconRow}>
            <Ionicons name="sparkles" size={28} color="#FCD34D" />
            <Ionicons name="star" size={20} color="#FCD34D" style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.heroTitle}>V-Tech</Text>
          <Text style={styles.heroTitleAccent}>{saleTitle}</Text>
          <Text style={styles.heroSubtitle}>
            Massive discounts across all categories
          </Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Sale ends in</Text>
            <View style={styles.countdownRow}>
              <View style={styles.countdownBlock}>
                <Text style={styles.countdownValue}>
                  {formatCountdownUnit(days)}
                </Text>
                <Text style={styles.countdownUnit}>Days</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownBlock}>
                <Text style={styles.countdownValue}>
                  {formatCountdownUnit(hours)}
                </Text>
                <Text style={styles.countdownUnit}>Hrs</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownBlock}>
                <Text style={styles.countdownValue}>
                  {formatCountdownUnit(minutes)}
                </Text>
                <Text style={styles.countdownUnit}>Min</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownBlock}>
                <Text style={styles.countdownValue}>
                  {formatCountdownUnit(seconds)}
                </Text>
                <Text style={styles.countdownUnit}>Sec</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Festival Features Strip */}
      <View style={styles.featuresRow}>
        <View style={styles.featureItem}>
          <Ionicons name="flash" size={18} color={colors.secondary} />
          <Text style={styles.featureText}>Flash Deals</Text>
        </View>
        <View style={styles.featureDivider} />
        <View style={styles.featureItem}>
          <Ionicons name="headset" size={18} color={colors.success} />
          <Text style={styles.featureText}>24/7 Support</Text>
        </View>
        <View style={styles.featureDivider} />
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark" size={18} color={colors.info} />
          <Text style={styles.featureText}>Genuine</Text>
        </View>
      </View>

      {/* Category-wise Deal Strips */}
      {categoryStrips.map((strip) => {
        const items = categoryProducts[strip.key] || [];
        const isLoading = loadingCategories[strip.key];

        return (
          <View key={strip.key} style={styles.stripSection}>
            {/* Strip Header */}
            <LinearGradient
              colors={strip.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stripHeader}
            >
              <View style={styles.stripHeaderLeft}>
                <Ionicons name={strip.icon} size={22} color={colors.white} />
                <Text style={styles.stripHeaderTitle}>{strip.title}</Text>
              </View>
              <View style={styles.stripHeaderBadge}>
                <Text style={styles.stripHeaderBadgeText}>Up to 50% off</Text>
              </View>
            </LinearGradient>

            {/* Strip Products */}
            {isLoading ? (
              <View style={styles.stripLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.stripLoadingText}>Loading deals...</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.stripEmpty}>
                <Ionicons name="pricetag-outline" size={32} color={colors.border} />
                <Text style={styles.stripEmptyText}>Deals coming soon!</Text>
              </View>
            ) : (
              <FlatList
                data={items.slice(0, 10)}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => renderStripProduct(item)}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.stripList}
              />
            )}
          </View>
        );
      })}

      {/* Shop All Deals Button */}
      <View style={styles.shopAllContainer}>
        <TouchableOpacity
          style={styles.shopAllBtn}
          onPress={() => router.push('/deals')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shopAllGradient}
          >
            <Ionicons name="pricetags" size={20} color={colors.white} />
            <Text style={styles.shopAllText}>Shop All Deals</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bottom Banner */}
      <LinearGradient
        colors={['#FEF3C7', '#FDE68A']}
        style={styles.bottomBanner}
      >
        <Ionicons name="gift" size={28} color="#D97706" />
        <View style={styles.bottomBannerContent}>
          <Text style={styles.bottomBannerTitle}>Use code FESTIVE15</Text>
          <Text style={styles.bottomBannerSubtitle}>
            Extra 15% off on festival collection
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bottomBannerBtn}
          onPress={() => router.push('/pages/coupons')}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomBannerBtnText}>View</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Hero Banner
  heroBanner: {
    padding: spacing.xl,
    paddingTop: spacing.xl + spacing.md + 56,
    paddingBottom: spacing.xl + spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroDecoCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: 1,
  },
  heroTitleAccent: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: '#FCD34D',
    marginTop: -4,
    letterSpacing: 2,
  },
  heroSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  countdownContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  countdownBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 56,
  },
  countdownValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
  },
  countdownUnit: {
    fontSize: fontSize.xs - 1,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  countdownSeparator: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Features Row
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  featureDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },

  // Category Strips
  stripSection: {
    marginTop: spacing.lg,
  },
  stripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  stripHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stripHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  stripHeaderBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  stripHeaderBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  stripList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  stripLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  stripLoadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  stripEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  stripEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Strip Product Card
  stripCard: {
    width: STRIP_CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  stripImageContainer: {
    position: 'relative',
  },
  stripImage: {
    width: '100%',
    height: STRIP_CARD_WIDTH * 1.05,
  },
  stripImagePlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripDiscountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  stripDiscountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    lineHeight: 14,
  },
  stripDiscountLabel: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.white,
    lineHeight: 10,
  },
  stripCardInfo: {
    padding: spacing.sm + 2,
  },
  stripCardTitle: {
    fontSize: fontSize.sm - 1,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 17,
    marginBottom: spacing.xs,
  },
  stripPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  stripPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  stripComparePrice: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  stripCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  stripCartBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Shop All Deals
  shopAllContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  shopAllBtn: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  shopAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  shopAllText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Bottom Banner
  bottomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  bottomBannerContent: {
    flex: 1,
  },
  bottomBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#92400E',
  },
  bottomBannerSubtitle: {
    fontSize: fontSize.xs,
    color: '#B45309',
    marginTop: 2,
  },
  bottomBannerBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  bottomBannerBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
