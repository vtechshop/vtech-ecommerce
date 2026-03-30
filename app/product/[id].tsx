import React, { useEffect, useState, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, FlatList, Alert, Share, Modal, Pressable, Linking, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { productsApi } from '../../src/api/products';
import { userApi } from '../../src/api/user';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';
import { useRecentlyViewed } from '../../src/hooks/useRecentlyViewed';
import { Product, Review } from '../../src/types';
import AnimatedProductCard from '../../src/components/product/AnimatedProductCard';
import ImageThumbnailStrip from '../../src/components/product/ImageThumbnailStrip';
import RatingBreakdown from '../../src/components/product/RatingBreakdown';
import { OffersCard, ReturnPolicyBadges } from '../../src/components/product/OffersAndPolicies';
import CollapsibleSection from '../../src/components/product/CollapsibleSection';
import FrequentlyBoughtTogether from '../../src/components/product/FrequentlyBoughtTogether';
import PincodeChecker from '../../src/components/product/PincodeChecker';
import Button from '../../src/components/ui/Button';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { useToast } from '../../src/components/ui/Toast';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing } from '../../src/theme';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

function AnimatedDot({ active }: { active: boolean }) {
  const dotWidth = useSharedValue(active ? 28 : 8);
  const opacity = useSharedValue(active ? 1 : 0.4);
  useEffect(() => {
    dotWidth.value = withTiming(active ? 28 : 8, { duration: 300 });
    opacity.value = withTiming(active ? 1 : 0.4, { duration: 300 });
  }, [active]);
  const animStyle = useAnimatedStyle(() => ({ width: dotWidth.value, opacity: opacity.value }));
  return <Animated.View style={[styles.dot, animStyle]} />;
}

function StaggeredView({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

function SlideUpView({ children, style }: { children: React.ReactNode; style?: any }) {
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);
  useEffect(() => {
    translateY.value = withDelay(200, withSpring(0, { damping: 20, stiffness: 150 }));
    opacity.value = withDelay(200, withTiming(1, { duration: 300 }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }], opacity: opacity.value }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

function getDeliveryEstimate() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Error boundary to catch and display crashes
class ProductErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message || String(error) };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ProductDetail crash:', error, info?.componentStack);
  }
  resetError = () => {
    this.setState({ hasError: false, error: '' });
  };
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background }}>
          <Ionicons name="bug-outline" size={48} color={colors.error} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.error, marginTop: 12, marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 4 }}>{this.state.error}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>Please report this if it persists.</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={this.resetError} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 12 }}>
              <Text style={{ color: colors.white, fontWeight: '600' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function ProductDetailWrapper() {
  return (
    <ProductErrorBoundary>
      <ProductDetailScreen />
    </ProductErrorBoundary>
  );
}

function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const cartItemCount = useAppSelector((s) => s.cart.cart?.items.length ?? 0);
  const { showToast } = useToast();
  const { addItem: addToRecentlyViewed } = useRecentlyViewed();
  const carouselRef = useRef<ScrollView>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [reviewFilter, setReviewFilter] = useState(0); // 0 = all, 1-5 = star filter
  const [reviewSort, setReviewSort] = useState<'recent' | 'helpful'>('recent');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});
  const [showHeavySections, setShowHeavySections] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  const loadProduct = async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [prodRes, revRes] = await Promise.all([
        productsApi.getById(id),
        productsApi.getReviews(id, { limit: 10 }).catch(() => ({ data: { data: [] } })),
      ]);
      const prod = prodRes.data?.data;
      if (!prod || !prod._id) {
        setError('Product data is invalid');
        setLoading(false);
        return;
      }
      setProduct(prod);
      setReviews(Array.isArray(revRes.data?.data) ? revRes.data.data : []);
      if (prod.title) navigation.setOptions({
        title: prod.title,
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/(tabs)/cart' as any)} style={{ marginRight: 8, padding: 4 }}>
            <View>
              <Ionicons name="cart-outline" size={26} color={colors.text} />
              {cartItemCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#e53935', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{cartItemCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ),
      });
      addToRecentlyViewed(prod);
      productsApi.getSimilar(id).then((res) => {
        const similar = Array.isArray(res.data?.data) ? res.data.data : [];
        setSimilarProducts(similar.slice(0, 6));
      }).catch(() => {});
    } catch (e: any) {
      // Error handled by state
      setError(e.response?.data?.message || 'Failed to load product');
    }
    setLoading(false);
  };

  useEffect(() => { loadProduct(); }, [id]);

  // Defer heavy sections to avoid overwhelming the JS thread on mount
  useEffect(() => {
    if (!loading && product) {
      const timer = setTimeout(() => setShowHeavySections(true), 100);
      return () => clearTimeout(timer);
    }
    setShowHeavySections(false);
  }, [loading, product?._id]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to cart', [
        { text: 'Cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    const result = await dispatch(addToCart({ productId: product._id, quantity }));
    if (addToCart.fulfilled.match(result)) {
      setShowCartPanel(true);
    } else {
      showToast('error', 'Failed to add to cart', (result.payload as string) || 'Please try again');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to continue', [
        { text: 'Cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    const result = await dispatch(addToCart({ productId: product._id, quantity }));
    if (addToCart.fulfilled.match(result)) {
      router.push('/checkout' as any);
    } else {
      Alert.alert('Error', (result.payload as string) || 'Failed to add to cart');
    }
  };

  const handleWishlist = async () => {
    if (!product || !isAuthenticated) return;
    try {
      if (isWishlisted) await userApi.removeFromWishlist(product._id);
      else await userApi.addToWishlist(product._id);
      setIsWishlisted(!isWishlisted);
    } catch { Alert.alert('Error', 'Failed to update wishlist'); }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.title} on V-Tech Kitchen!\n₹${product.price.toLocaleString()}\nhttps://vtechkitchen.com/product/${product.slug}`,
        title: product.title,
      });
    } catch {}
  };

  const handleThumbnailPress = (index: number) => {
    carouselRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveImage(index);
  };

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveImage(idx);
  };

  const handleVideoPress = () => {
    if (product?.videoUrl) Linking.openURL(product.videoUrl);
  };

  const handleAddAllToCart = async (productIds: string[]) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to cart', [
        { text: 'Cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    try {
      await Promise.all(productIds.map((pid) => dispatch(addToCart({ productId: pid, quantity: 1 }))));
      Alert.alert('Added to Cart', `${productIds.length} items added to your cart`);
    } catch {
      Alert.alert('Error', 'Failed to add some items');
    }
  };

  if (loading) return <LoadingScreen />;

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <TouchableOpacity onPress={loadProduct} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Compute highlights (plain variable - no hooks after early returns)
  const highlights = product.tags && product.tags.length > 0
    ? product.tags.slice(0, 4)
    : product.specifications && product.specifications.length > 0
      ? product.specifications.slice(0, 3).map((s) => `${s.label}: ${s.value}`)
      : [];

  const discount = product.compareAt ? Math.round(((product.compareAt - (product.price || 0)) / product.compareAt) * 100) : 0;
  const savedAmount = product.compareAt ? product.compareAt - (product.price || 0) : 0;
  const vendorInfo = typeof product.vendorId === 'object' && product.vendorId ? product.vendorId : null;
  const isLowStock = (product.stock || 0) > 0 && (product.stock || 0) <= 5;
  const deliveryEstimate = getDeliveryEstimate();

  return (
    <View style={styles.container}>
      {/* Image Zoom Modal - only mount when visible to avoid FlatList conflicts */}
      {zoomVisible && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
          <View style={styles.zoomOverlay}>
            <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomVisible(false)}>
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
            <FlatList
              data={(product.images || []).filter(Boolean)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(zoomIndex, (product.images || []).length - 1)}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              keyExtractor={(_, i) => `zoom-${i}`}
              renderItem={({ item }) => (
                <View style={{ width, height: SCREEN_HEIGHT * 0.7, justifyContent: 'center', alignItems: 'center' }}>
                  <Image source={{ uri: item }} style={{ width, height: SCREEN_HEIGHT * 0.7 }} contentFit="contain" />
                </View>
              )}
            />
            <Text style={styles.zoomHint}>Swipe to navigate</Text>
          </View>
        </Modal>
      )}

      <ScrollView>
        {/* Image Carousel */}
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onCarouselScroll}
          nestedScrollEnabled
        >
          {(product.images || []).filter(Boolean).map((img, index) => (
            <Pressable key={index} onPress={() => { setZoomIndex(index); setZoomVisible(true); }}>
              <Image source={{ uri: img }} style={styles.image} contentFit="contain" />
            </Pressable>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color={colors.primary} />
        </TouchableOpacity>

        {/* Dots */}
        <View style={styles.dots}>
          {(product.images || []).filter(Boolean).map((_, i) => <AnimatedDot key={i} active={i === activeImage} />)}
        </View>

        {/* Thumbnail Strip */}
        <ImageThumbnailStrip
          images={(product.images || []).filter(Boolean)}
          activeIndex={activeImage}
          onThumbnailPress={handleThumbnailPress}
          videoUrl={product.videoUrl}
          onVideoPress={handleVideoPress}
        />

        {/* ── CARD 1: Brand + Title + Rating ── */}
        <View style={styles.card}>
          {product.brand && (
            <TouchableOpacity>
              <Text style={styles.brand}>Visit the <Text style={styles.brandLink}>{product.brand}</Text> Store</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{product.title}</Text>

          <View style={styles.ratingRow}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons key={star} name={star <= Math.round(product.rating ?? 0) ? 'star' : 'star-outline'} size={15} color="#FF9900" />
              ))}
            </View>
            <Text style={styles.ratingLink}>{(product.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.ratingCount}>{product.reviewCount ?? 0} ratings</Text>
            {product.reviewCount > 0 && <Text style={styles.ratingDot}>·</Text>}
            {product.reviewCount > 0 && <Text style={styles.ratingCount}>{product.reviewCount} reviews</Text>}
          </View>

          {/* Rating Breakdown */}
          {reviews.length > 0 && (
            <View style={{ marginTop: spacing.sm }}>
              <RatingBreakdown reviews={reviews} averageRating={product.rating ?? 0} totalCount={product.reviewCount ?? 0} />
            </View>
          )}
        </View>

        {/* ── CARD 2: Price ── */}
        <View style={styles.card}>
          {product.compareAt ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.mrpLabel}>M.R.P.:</Text>
                <Text style={styles.compareAt}>₹{(product.compareAt ?? 0).toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Text style={styles.price}>₹{(product.price ?? 0).toLocaleString()}</Text>
                <View style={styles.discountBadge}><Text style={styles.discountText}>{discount}% off</Text></View>
              </View>
              <Text style={styles.saveText}>You Save: ₹{savedAmount.toLocaleString()} ({discount}%)</Text>
            </>
          ) : (
            <Text style={styles.price}>₹{(product.price ?? 0).toLocaleString()}</Text>
          )}
          <Text style={styles.taxNote}>Inclusive of all taxes. FREE Delivery.</Text>
        </View>

        {/* ── CARD 3: Delivery + Stock ── */}
        <View style={styles.card}>
          {(product.stock ?? 0) > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="car-outline" size={18} color={colors.text} />
                <Text style={styles.deliveryLabel}>
                  FREE delivery <Text style={{ fontWeight: '700', color: '#0F1111' }}>{deliveryEstimate}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.inStockText}>In stock.</Text>
                {isLowStock && (
                  <Text style={styles.lowStockNote}>Only {product.stock} left – order soon.</Text>
                )}
              </View>
            </>
          ) : (
            <Text style={{ color: colors.error, fontWeight: '700', fontSize: 15 }}>Currently unavailable</Text>
          )}
          <PincodeChecker deliveryEstimate={deliveryEstimate} />
        </View>

        {/* ── CARD 4: Seller + Trust ── */}
        <View style={styles.card}>
          {vendorInfo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Text style={styles.sellerLabel}>Sold by</Text>
              <Text style={styles.sellerName}>{vendorInfo.storeName}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#067D62" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Secure transaction</Text>
          </View>
          <OffersCard />
          <ReturnPolicyBadges />
        </View>

        {/* ── CARD 5: About this item ── */}
        {highlights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.aboutTitle}>About this item</Text>
            {highlights.map((item, i) => (
              <View key={i} style={styles.aboutRow}>
                <Text style={styles.aboutBullet}>›</Text>
                <Text style={styles.aboutText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── CARD 6: Variants + Quantity ── */}
        {(product.variants?.length > 0 || true) && (
          <View style={styles.card}>
            {product.variants && product.variants.length > 0 && product.variants.map((variant) => (
              <View key={variant._id} style={{ marginBottom: spacing.md }}>
                <Text style={styles.variantLabel}>{variant.name}:</Text>
                <View style={styles.variantOptions}>
                  {variant.options.map((opt, i) => {
                    const isSelected = (selectedVariants[variant._id] ?? 0) === i;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.variantChip, isSelected && styles.variantChipActive]}
                        onPress={() => setSelectedVariants((prev) => ({ ...prev, [variant._id]: i }))}
                      >
                        <Text style={[styles.variantChipText, isSelected && styles.variantChipTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={styles.qtySection}>
              <Text style={styles.qtyLabel}>Qty:</Text>
              <View style={styles.qtyPill}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => quantity > 1 && setQuantity(quantity - 1)}>
                  <Ionicons name="remove" size={18} color={quantity > 1 ? colors.primary : colors.border} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => quantity < (product.stock ?? 99) && setQuantity(quantity + 1)}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── CARD 7: Specifications ── */}
        {(product.specifications ?? []).length > 0 && (
          <View style={styles.card}>
            <CollapsibleSection title="Technical Details">
              <View style={styles.specsCard}>
                {(product.specifications ?? []).map((spec, i) => (
                  <View key={i} style={[styles.specRow, { backgroundColor: i % 2 === 0 ? '#f7f8fa' : '#fff' }]}>
                    <Text style={styles.specLabel}>{spec.label}</Text>
                    <Text style={styles.specValue}>{spec.value}</Text>
                  </View>
                ))}
              </View>
            </CollapsibleSection>
          </View>
        )}

        {/* ── CARD 8: Description ── */}
        <View style={styles.card}>
          <CollapsibleSection title="Product Description" defaultExpanded>
            {(product.description || '').split('\n').filter(Boolean).map((para, i) => {
              const isHeading = para.length < 80 && !para.endsWith('.') && !para.endsWith(',');
              return <Text key={i} style={isHeading ? styles.descHeading : styles.descParagraph}>{para}</Text>;
            })}
          </CollapsibleSection>
        </View>

        {/* ── Warranty ── */}
        {product.hasWarranty && product.warranty && (
          <View style={styles.card}>
            <View style={styles.warrantyBadge}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.warrantyDuration}>{product.warranty.duration} {product.warranty.durationType} Warranty</Text>
            </View>
            {product.warranty.description && <Text style={styles.warrantyDesc}>{product.warranty.description}</Text>}
          </View>
        )}

          {/* Heavy sections - deferred render to avoid mount overload */}
          {showHeavySections && (
            <>
              {/* FAQs (Collapsible) */}
              {(product.faqs ?? []).length > 0 && (
                <StaggeredView delay={100}>
                  <CollapsibleSection title="FAQs">
                    {(product.faqs ?? []).map((faq, i) => (
                      <View key={i} style={styles.faqCard}>
                        <View style={styles.faqQRow}><Ionicons name="help-circle" size={18} color={colors.primary} /><Text style={styles.faqQuestion}>{faq.question}</Text></View>
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      </View>
                    ))}
                  </CollapsibleSection>
                </StaggeredView>
              )}

              {/* ── CARD 9: Reviews ── */}
              {reviews.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Customer Reviews</Text>
                  {/* Sort controls */}
                  <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.md }}>
                    {['recent', 'helpful'].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.sortChip, reviewSort === s && styles.sortChipActive]}
                        onPress={() => setReviewSort(s as any)}
                      >
                        <Text style={[styles.sortChipText, reviewSort === s && styles.sortChipTextActive]}>
                          {s === 'recent' ? 'Most Recent' : 'Most Helpful'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Filter chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ gap: spacing.xs, marginBottom: spacing.md }}>
                    {[0, 5, 4, 3, 2, 1].map((star) => (
                      <TouchableOpacity
                        key={star}
                        style={[styles.reviewFilterChip, reviewFilter === star && styles.reviewFilterChipActive]}
                        onPress={() => setReviewFilter(star === reviewFilter ? 0 : star)}
                      >
                        {star > 0 ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Text style={[styles.reviewFilterText, reviewFilter === star && styles.reviewFilterTextActive]}>{star}</Text>
                            <Ionicons name="star" size={10} color={reviewFilter === star ? colors.white : colors.secondary} />
                          </View>
                        ) : (
                          <Text style={[styles.reviewFilterText, reviewFilter === star && styles.reviewFilterTextActive]}>All</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {/* Review cards */}
                  {reviews
                    .filter((r) => reviewFilter === 0 || Math.round(r.rating) === reviewFilter)
                    .sort((a, b) => reviewSort === 'recent'
                      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      : (b.verifiedPurchase ? 1 : 0) - (a.verifiedPurchase ? 1 : 0)
                    )
                    .slice(0, 5)
                    .map((review, idx, arr) => (
                      <View key={review._id} style={[styles.reviewCard, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#e7e7e7' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <View style={styles.reviewAvatar}>
                            <Text style={styles.reviewAvatarText}>{(review.userId?.name || 'U')[0].toUpperCase()}</Text>
                          </View>
                          <Text style={styles.reviewAuthor}>{review.userId?.name || 'User'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View style={styles.reviewStars}>
                            {[1, 2, 3, 4, 5].map((s) => <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={13} color="#FF9900" />)}
                          </View>
                          {review.verifiedPurchase && (
                            <Text style={styles.verified}>✓ Verified Purchase</Text>
                          )}
                        </View>
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
                          {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                      </View>
                    ))
                  }
                  {reviews.filter((r) => reviewFilter === 0 || Math.round(r.rating) === reviewFilter).length === 0 && (
                    <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }}>No {reviewFilter}-star reviews yet</Text>
                  )}
                  {reviews.length > 0 && (
                    <TouchableOpacity style={styles.seeAllReviewsBtn}>
                      <Text style={styles.seeAllReviewsText}>See all {product.reviewCount ?? reviews.length} reviews</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Frequently Bought Together */}
              {similarProducts.length >= 2 && (
                <View style={styles.card}>
                  <FrequentlyBoughtTogether
                    currentProduct={product}
                    similarProducts={similarProducts}
                    onAddAllToCart={handleAddAllToCart}
                  />
                </View>
              )}

              {/* Similar Products */}
              {similarProducts.length > 0 && (
                <View style={[styles.card, { paddingHorizontal: 0 }]}>
                  <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.md }]}>You May Also Like</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm, paddingTop: spacing.sm }}>
                    {similarProducts.map((item, index) => (
                      <AnimatedProductCard key={`sim-${item._id}`} product={item} index={index} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
      </ScrollView>

      {/* Added to Cart Panel - Amazon style */}
      {showCartPanel && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowCartPanel(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowCartPanel(false)}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.cartPanel}>
                {/* Green tick header */}
                <View style={styles.cartPanelHeader}>
                  <View style={styles.cartPanelTick}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </View>
                  <Text style={styles.cartPanelTitle}>Added to Cart</Text>
                  <TouchableOpacity onPress={() => setShowCartPanel(false)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Product preview */}
                {product && (
                  <View style={styles.cartPanelProduct}>
                    <Image
                      source={{ uri: product.images?.[0] }}
                      style={styles.cartPanelImage}
                      contentFit="contain"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartPanelProductName} numberOfLines={2}>{product.title}</Text>
                      <Text style={styles.cartPanelProductPrice}>₹{(product.price ?? 0).toLocaleString()}</Text>
                      <Text style={styles.cartPanelQty}>Qty: {quantity}</Text>
                    </View>
                  </View>
                )}

                {/* Cart count */}
                <View style={styles.cartPanelCountRow}>
                  <Ionicons name="cart" size={18} color={colors.textSecondary} />
                  <Text style={styles.cartPanelCount}>{cartItemCount} item{cartItemCount !== 1 ? 's' : ''} in cart</Text>
                </View>

                {/* Buttons */}
                <TouchableOpacity
                  style={styles.goToCartBtn}
                  onPress={() => { setShowCartPanel(false); router.push('/(tabs)/cart' as any); }}
                >
                  <Ionicons name="cart" size={18} color="#fff" />
                  <Text style={styles.goToCartText}>Go to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.continueShoppingBtn}
                  onPress={() => setShowCartPanel(false)}
                >
                  <Text style={styles.continueShoppingText}>Continue Shopping</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Bottom Bar: Wishlist + Add to Cart + Buy Now */}
      <SlideUpView style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 10) }]}>
        <TouchableOpacity style={styles.wishlistButton} onPress={handleWishlist}>
          <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={22} color={isWishlisted ? '#e53935' : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addToCartBtn, (product.stock !== undefined && product.stock <= 0) && { opacity: 0.5 }]}
          onPress={handleAddToCart}
          disabled={product.stock !== undefined && product.stock <= 0}
        >
          <Text style={styles.addToCartText}>{product.stock !== undefined && product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowBtn, (product.stock !== undefined && product.stock <= 0) && { opacity: 0.5 }]}
          onPress={handleBuyNow}
          disabled={product.stock !== undefined && product.stock <= 0}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </SlideUpView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.background },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' as const },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryBtnText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  image: { width, height: width, backgroundColor: '#fff' },
  shareBtn: { position: 'absolute', top: spacing.xl + spacing.md, right: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.full, padding: spacing.sm + 2, ...shadows.md },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.sm, gap: spacing.xs + 2, backgroundColor: colors.white },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  // ── Cards (each major section is its own white card) ──
  card: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: 8 },
  info: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg, marginBottom: 8 },
  brand: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  brandLink: { color: colors.primary, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '500', color: '#0F1111', lineHeight: 24, marginBottom: 10 },
  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  ratingLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  ratingCount: { fontSize: 13, color: colors.primary },
  ratingDot: { fontSize: 13, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: '#e7e7e7', marginVertical: 10 },
  // Price
  mrpLabel: { fontSize: 13, color: colors.textSecondary },
  compareAt: { fontSize: 13, color: colors.textSecondary, textDecorationLine: 'line-through' },
  price: { fontSize: 28, fontWeight: '700', color: '#B12704' },
  discountBadge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  discountText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  saveText: { fontSize: 13, color: '#067D62', fontWeight: '600', marginTop: 2 },
  taxNote: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  // Delivery
  inStockText: { fontSize: 16, color: '#067D62', fontWeight: '700' },
  lowStockNote: { fontSize: 12, color: '#e53935', fontWeight: '600' },
  deliveryLabel: { fontSize: 13, color: '#0F1111', flex: 1 },
  // Seller
  sellerLabel: { fontSize: 13, color: colors.textSecondary },
  sellerName: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { fontSize: 10, color: '#067D62', fontWeight: '700' },
  // About this item
  aboutTitle: { fontSize: 16, fontWeight: '700', color: '#0F1111', marginBottom: 12 },
  aboutRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  aboutBullet: { fontSize: 18, color: colors.primary, lineHeight: 20, fontWeight: '700' },
  aboutText: { flex: 1, fontSize: 13, color: '#0F1111', lineHeight: 20 },
  // Variants / Qty
  variantLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
  variantOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  variantChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  variantChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  variantChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  variantChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  qtySection: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  qtyLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  qtyPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden', backgroundColor: '#f7f7f7' },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  qtyValue: { fontSize: 15, fontWeight: '700', minWidth: 32, textAlign: 'center', color: colors.text },
  sectionTitleWrapper: { marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F1111', marginBottom: spacing.sm },
  sectionAccent: { width: 24, height: 3, backgroundColor: colors.primary, borderRadius: 2, marginTop: 4 },
  specsCard: { overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: '#e7e7e7' },
  specRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: spacing.md },
  specBorder: { borderTopWidth: 1, borderTopColor: '#e7e7e7' },
  specLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0F1111' },
  specValue: { flex: 1.5, fontSize: 13, color: colors.textSecondary },
  descriptionCard: { backgroundColor: colors.white },
  descHeading: { fontSize: 14, fontWeight: '700', color: '#0F1111', marginTop: spacing.md, marginBottom: spacing.xs },
  descParagraph: { fontSize: 13, color: '#555', lineHeight: 22, marginBottom: spacing.sm },
  warrantyCard: { backgroundColor: colors.successLight, borderRadius: borderRadius.xl, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.success },
  warrantyBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warrantyDuration: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.success, textTransform: 'capitalize' },
  warrantyDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
  faqCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  faqQRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  faqQuestion: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  faqAnswer: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, marginLeft: spacing.sm + 18, lineHeight: 20 },
  reviewControls: { marginBottom: spacing.md },
  reviewFilterChip: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 1, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  reviewFilterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  reviewFilterText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  reviewFilterTextActive: { color: colors.white },
  sortChip: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  sortChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  sortChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  reviewCard: { paddingVertical: spacing.md },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: '#0F1111' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: 13, color: '#0F1111', lineHeight: 20, marginTop: 4 },
  verified: { fontSize: 11, color: '#067D62', fontWeight: '600' },
  seeAllReviewsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#e7e7e7', gap: 4 },
  seeAllReviewsText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  // Bottom bar
  bottomBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white, gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e0e0e0', ...shadows.xl },
  wishlistButton: { width: 44, height: 44, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  addToCartBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.primaryLighter, justifyContent: 'center', alignItems: 'center' },
  addToCartText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  buyNowBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  buyNowText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  // Zoom modal
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  zoomClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: spacing.sm },
  zoomHint: { color: 'rgba(255,255,255,0.5)', fontSize: fontSize.xs, textAlign: 'center', paddingBottom: spacing.xl },
  // Cart panel
  cartPanel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 0 },
  cartPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cartPanelTick: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#067D62', justifyContent: 'center', alignItems: 'center' },
  cartPanelTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0F1111' },
  cartPanelProduct: { flexDirection: 'row', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e7e7e7', marginBottom: 12 },
  cartPanelImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#f7f7f7' },
  cartPanelProductName: { fontSize: 13, color: '#0F1111', fontWeight: '500', lineHeight: 18 },
  cartPanelProductPrice: { fontSize: 16, fontWeight: '700', color: '#B12704', marginTop: 4 },
  cartPanelQty: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cartPanelCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  cartPanelCount: { fontSize: 13, color: colors.textSecondary },
  goToCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 14, marginBottom: 10 },
  goToCartText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  continueShoppingBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 24, borderWidth: 1.5, borderColor: colors.border },
  continueShoppingText: { fontSize: 15, fontWeight: '600', color: colors.text },
  // Legacy - kept to avoid missing refs
  urgencyBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningLight, borderLeftWidth: 3, borderLeftColor: colors.warning, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  urgencyText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  sellerIcon: { width: 36, height: 36, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  sellerMeta: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.medium },
});
