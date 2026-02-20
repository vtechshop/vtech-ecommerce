import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { productsApi } from '../../src/api/products';
import { Product } from '../../src/types';
import { useAppDispatch } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;

type TabKey = 'flash' | 'daily' | 'clearance';

interface Tab {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'flash', label: 'Flash Deals', icon: 'flash' },
  { key: 'daily', label: 'Daily Deals', icon: 'today' },
  { key: 'clearance', label: 'Clearance', icon: 'pricetags' },
];

// Generate a stable countdown for flash deals based on product ID.
// Same product shows same countdown for the rest of the day, resets at midnight.
function generateCountdown(productId: string): number {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const msUntilEndOfDay = endOfDay.getTime() - now.getTime();
  // Use product ID hash to create a consistent offset (1-6 hours) within the day
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash) + productId.charCodeAt(i);
    hash |= 0;
  }
  const maxDuration = 6 * 60 * 60 * 1000; // 6 hours
  const offset = (Math.abs(hash) % maxDuration) + 3600000; // 1-7 hours
  // Pick the smaller of: offset or time until end of day
  return Date.now() + Math.min(offset, msUntilEndOfDay);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getDiscount(product: Product): number {
  if (!product.compareAt || product.compareAt <= product.price) return 0;
  return Math.round(((product.compareAt - product.price) / product.compareAt) * 100);
}

export default function DealsScreen() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabKey>('flash');
  const [products, setProducts] = useState<Record<TabKey, Product[]>>({
    flash: [],
    daily: [],
    clearance: [],
  });
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    flash: true,
    daily: false,
    clearance: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProducts = useCallback(async (tab: TabKey, isRefresh = false) => {
    if (!isRefresh) {
      setLoading((prev) => ({ ...prev, [tab]: true }));
    }
    try {
      let response;
      switch (tab) {
        case 'flash':
          response = await productsApi.getFeatured();
          break;
        case 'daily':
          response = await productsApi.getRecommendations();
          break;
        case 'clearance':
          response = await productsApi.getAll({ sort: 'price_asc' });
          break;
      }
      const data = response?.data?.data || [];
      const items = Array.isArray(data) ? data : [];
      setProducts((prev) => ({ ...prev, [tab]: items }));

      // Generate countdowns for flash deal items
      if (tab === 'flash') {
        const newCountdowns: Record<string, number> = {};
        items.forEach((p: Product) => {
          newCountdowns[p._id] = generateCountdown(p._id);
        });
        setCountdowns((prev) => ({ ...prev, ...newCountdowns }));
      }
    } catch (error) {
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  useEffect(() => {
    fetchProducts('flash');
  }, []);

  useEffect(() => {
    // Fetch data when switching tabs if not already loaded
    if (products[activeTab].length === 0 && !loading[activeTab]) {
      fetchProducts(activeTab);
    }
  }, [activeTab]);

  // Countdown timer for flash deals
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts(activeTab, true);
    setRefreshing(false);
  }, [activeTab, fetchProducts]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      dispatch(addToCart({ productId: product._id, quantity: 1 }));
    },
    [dispatch],
  );

  const renderFlashCard = (product: Product) => {
    const discount = getDiscount(product);
    const endTime = countdowns[product._id] || 0;
    const remaining = endTime - now;

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/product/${product._id}`)}
      >
        <View style={styles.imageContainer}>
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color={colors.border} />
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          <View style={styles.flashBadge}>
            <Ionicons name="flash" size={12} color={colors.white} />
            <Text style={styles.flashBadgeText}>FLASH</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{(product.price ?? 0).toLocaleString()}
            </Text>
            {product.compareAt ? (
              <Text style={styles.comparePrice}>
                ₹{(product.compareAt ?? 0).toLocaleString()}
              </Text>
            ) : null}
          </View>
          {/* Countdown timer */}
          <View style={styles.countdownRow}>
            <Ionicons name="time-outline" size={14} color={colors.error} />
            <Text style={styles.countdownText}>
              {remaining > 0 ? formatCountdown(remaining) : 'Expired'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={() => handleAddToCart(product)}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={16} color={colors.white} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderDailyCard = (product: Product) => {
    const discount = getDiscount(product);

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/product/${product._id}`)}
      >
        <View style={styles.imageContainer}>
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color={colors.border} />
            </View>
          )}
          {discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          <View style={[styles.flashBadge, { backgroundColor: colors.info }]}>
            <Ionicons name="today" size={12} color={colors.white} />
            <Text style={styles.flashBadgeText}>TODAY</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{(product.price ?? 0).toLocaleString()}
            </Text>
            {product.compareAt ? (
              <Text style={styles.comparePrice}>
                ₹{(product.compareAt ?? 0).toLocaleString()}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={() => handleAddToCart(product)}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={16} color={colors.white} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderClearanceCard = (product: Product) => {
    const discount = getDiscount(product);

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/product/${product._id}`)}
      >
        <View style={styles.imageContainer}>
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color={colors.border} />
            </View>
          )}
          {discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.discountText, { color: colors.text }]}>
                Up to {discount}% off
              </Text>
            </View>
          )}
          <View style={[styles.flashBadge, { backgroundColor: colors.accent }]}>
            <Ionicons name="pricetags" size={12} color={colors.white} />
            <Text style={styles.flashBadgeText}>SALE</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{(product.price ?? 0).toLocaleString()}
            </Text>
            {product.compareAt ? (
              <Text style={styles.comparePrice}>
                ₹{(product.compareAt ?? 0).toLocaleString()}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.addToCartBtn, { backgroundColor: colors.accent }]}
            onPress={() => handleAddToCart(product)}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={16} color={colors.white} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item }: { item: Product }) => {
    switch (activeTab) {
      case 'flash':
        return renderFlashCard(item);
      case 'daily':
        return renderDailyCard(item);
      case 'clearance':
        return renderClearanceCard(item);
    }
  };

  const currentProducts = products[activeTab];
  const isLoading = loading[activeTab];

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? colors.white : colors.textSecondary}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading deals...</Text>
        </View>
      ) : currentProducts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="pricetag-outline" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>No Deals Found</Text>
          <Text style={styles.emptySubtitle}>
            Check back soon for amazing deals!
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentProducts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: CARD_WIDTH * 1.05,
  },
  imagePlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  discountText: {
    color: colors.white,
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
  },
  flashBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  flashBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
  },
  cardInfo: {
    padding: spacing.sm + 2,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  comparePrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  countdownText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addToCartText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  refreshBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  refreshBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
