import React, { useEffect, useState, useMemo, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, FlatList, Alert, Share, Modal, Pressable, Linking, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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
  const { isAuthenticated } = useAppSelector((s) => s.auth);
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

  const loadProduct = async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      console.log('[ProductDetail] Loading product:', id);
      const [prodRes, revRes] = await Promise.all([
        productsApi.getById(id),
        productsApi.getReviews(id, { limit: 10 }).catch(() => ({ data: { data: [] } })),
      ]);
      const prod = prodRes.data?.data;
      if (!prod || !prod._id) {
        console.error('[ProductDetail] Invalid product data:', JSON.stringify(prodRes.data).slice(0, 200));
        setError('Product data is invalid');
        setLoading(false);
        return;
      }
      console.log('[ProductDetail] Product loaded:', prod.title, '| Images:', (prod.images || []).length);
      setProduct(prod);
      setReviews(Array.isArray(revRes.data?.data) ? revRes.data.data : []);
      if (prod.title) navigation.setOptions({ title: prod.title });
      addToRecentlyViewed(prod);
      productsApi.getSimilar(id).then((res) => {
        const similar = Array.isArray(res.data?.data) ? res.data.data : [];
        setSimilarProducts(similar.slice(0, 6));
      }).catch(() => {});
    } catch (e: any) {
      console.error('[ProductDetail] Load error:', e.message || e);
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
      Alert.alert('Added to Cart', `${product.title} added to your cart`);
    } else {
      Alert.alert('Error', (result.payload as string) || 'Failed to add to cart');
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

  const onCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveImage(idx);
  }, []);

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

  // useMemo MUST be before any early returns to follow Rules of Hooks
  const highlights = useMemo(() => {
    if (!product) return [];
    if (product.tags && product.tags.length > 0) return product.tags.slice(0, 4);
    if (product.specifications && product.specifications.length > 0) return product.specifications.slice(0, 3).map((s) => `${s.label}: ${s.value}`);
    return [];
  }, [product]);

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

  const discount = product.compareAt ? Math.round(((product.compareAt - (product.price || 0)) / product.compareAt) * 100) : 0;
  const savedAmount = product.compareAt ? product.compareAt - (product.price || 0) : 0;
  const vendorInfo = typeof product.vendorId === 'object' && product.vendorId ? product.vendorId : null;
  const isLowStock = (product.stock || 0) > 0 && (product.stock || 0) <= 5;
  const deliveryEstimate = getDeliveryEstimate();
  const safeImages = (product.images || []).filter(Boolean);

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
              <Image source={{ uri: img }} style={styles.image} contentFit="cover" />
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

        <View style={styles.info}>
          {/* Brand */}
          {product.brand && (
            <Text style={styles.brand}>{product.brand}</Text>
          )}

          {/* Title */}
          <StaggeredView delay={0}><Text style={styles.title}>{product.title}</Text></StaggeredView>

          {/* Rating Row */}
          <StaggeredView delay={100}>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons key={star} name={star <= (product.rating ?? 0) ? 'star' : 'star-outline'} size={18} color={colors.secondary} />
              ))}
              <Text style={styles.ratingText}>{(product.rating ?? 0).toFixed(1)} ({product.reviewCount ?? 0} reviews)</Text>
            </View>
          </StaggeredView>

          {/* Rating Breakdown */}
          {reviews.length > 0 && (
            <StaggeredView delay={150}>
              <View style={{ marginTop: spacing.sm }}>
                <RatingBreakdown reviews={reviews} averageRating={product.rating ?? 0} totalCount={product.reviewCount ?? 0} />
              </View>
            </StaggeredView>
          )}

          {/* Price Row + Save Indicator */}
          <StaggeredView delay={200}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{(product.price ?? 0).toLocaleString()}</Text>
              {product.compareAt && (
                <>
                  <Text style={styles.compareAt}>₹{(product.compareAt ?? 0).toLocaleString()}</Text>
                  <View style={styles.discountBadge}><Text style={styles.discountText}>{discount}% OFF</Text></View>
                </>
              )}
            </View>
            {savedAmount > 0 && (
              <View style={styles.saveRow}>
                <Ionicons name="trending-down" size={14} color={colors.success} />
                <Text style={styles.saveText}>You save ₹{savedAmount.toLocaleString()} ({discount}%)</Text>
              </View>
            )}
          </StaggeredView>

          {/* Stock + Urgency */}
          <StaggeredView delay={300}>
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              {isLowStock ? (
                <View style={styles.urgencyBanner}>
                  <Ionicons name="flash" size={16} color="#92400E" />
                  <Text style={styles.urgencyText}>Only {product.stock} left in stock - order soon!</Text>
                </View>
              ) : (
                <View style={styles.stockRow}>
                  <View style={[styles.stockDot, { backgroundColor: (product.stock ?? 0) > 0 ? colors.success : colors.error }]} />
                  <Text style={[styles.stockText, (product.stock ?? 0) > 0 ? { color: colors.success } : { color: colors.error }]}>
                    {(product.stock ?? 0) > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                  </Text>
                </View>
              )}

              {/* Delivery Estimate */}
              {(product.stock ?? 0) > 0 && (
                <View style={styles.deliveryBadge}>
                  <Ionicons name="car-outline" size={14} color={colors.info} />
                  <Text style={styles.deliveryText}>Delivery by {deliveryEstimate}</Text>
                </View>
              )}
            </View>
          </StaggeredView>

          {/* Pincode Checker */}
          <StaggeredView delay={320}>
            <View style={{ marginTop: spacing.md }}>
              <PincodeChecker deliveryEstimate={deliveryEstimate} />
            </View>
          </StaggeredView>

          {/* Offers */}
          <StaggeredView delay={350}>
            <View style={{ marginTop: spacing.md }}>
              <OffersCard />
            </View>
          </StaggeredView>

          {/* Return Policy Badges */}
          <StaggeredView delay={380}>
            <View style={{ marginTop: spacing.md }}>
              <ReturnPolicyBadges />
            </View>
          </StaggeredView>

          {/* Seller Card */}
          {vendorInfo && (
            <StaggeredView delay={400}>
              <View style={styles.sellerCard}>
                <View style={styles.sellerIcon}><Ionicons name="storefront" size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>Sold by {vendorInfo.storeName}</Text>
                  <Text style={styles.sellerMeta}>Verified Seller</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </StaggeredView>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <StaggeredView delay={420}>
              <View style={styles.sectionTitleWrapper}><Text style={styles.sectionTitle}>Highlights</Text><View style={styles.sectionAccent} /></View>
              <View style={styles.highlightsCard}>
                {highlights.map((item, i) => (
                  <View key={i} style={styles.highlightRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={styles.highlightText}>{item}</Text>
                  </View>
                ))}
              </View>
            </StaggeredView>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <StaggeredView delay={440}>
              {product.variants.map((variant) => (
                <View key={variant._id} style={{ marginTop: spacing.md }}>
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
            </StaggeredView>
          )}

          {/* Quantity */}
          <StaggeredView delay={470}>
            <View style={styles.qtySection}>
              <Text style={styles.qtyLabel}>Quantity:</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => quantity > 1 && setQuantity(quantity - 1)}>
                <Ionicons name="remove" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => quantity < (product.stock ?? 0) && setQuantity(quantity + 1)}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </StaggeredView>

          {/* Specifications (Collapsible) */}
          {(product.specifications ?? []).length > 0 && (
            <StaggeredView delay={500}>
              <CollapsibleSection title="Specifications">
                <View style={styles.specsCard}>
                  {(product.specifications ?? []).map((spec, i) => (
                    <View key={i} style={[styles.specRow, i > 0 && styles.specBorder]}>
                      <Text style={styles.specLabel}>{spec.label}</Text><Text style={styles.specValue}>{spec.value}</Text>
                    </View>
                  ))}
                </View>
              </CollapsibleSection>
            </StaggeredView>
          )}

          {/* Description (Collapsible, default open) */}
          <StaggeredView delay={600}>
            <CollapsibleSection title="Description" defaultExpanded>
              <View style={styles.descriptionCard}>
                {(product.description || '').split('\n').filter(Boolean).map((para, i) => {
                  const isHeading = para.length < 80 && !para.endsWith('.') && !para.endsWith(',');
                  return <Text key={i} style={isHeading ? styles.descHeading : styles.descParagraph}>{para}</Text>;
                })}
              </View>
            </CollapsibleSection>
          </StaggeredView>

          {/* Warranty */}
          {product.hasWarranty && product.warranty && (
            <StaggeredView delay={700}>
              <View style={styles.sectionTitleWrapper}><Text style={styles.sectionTitle}>Warranty</Text><View style={styles.sectionAccent} /></View>
              <View style={styles.warrantyCard}>
                <View style={styles.warrantyBadge}><Ionicons name="shield-checkmark" size={20} color={colors.success} /><Text style={styles.warrantyDuration}>{product.warranty.duration} {product.warranty.durationType} warranty</Text></View>
                {product.warranty.description && <Text style={styles.warrantyDesc}>{product.warranty.description}</Text>}
              </View>
            </StaggeredView>
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

              {/* Reviews */}
              {reviews.length > 0 && (
                <StaggeredView delay={200}>
                  <View style={styles.sectionTitleWrapper}><Text style={styles.sectionTitle}>Reviews ({product.reviewCount ?? 0})</Text><View style={styles.sectionAccent} /></View>
                  {/* Review Filter & Sort Controls */}
                  <View style={styles.reviewControls}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ gap: spacing.xs }}>
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
                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
                      <TouchableOpacity
                        style={[styles.sortChip, reviewSort === 'recent' && styles.sortChipActive]}
                        onPress={() => setReviewSort('recent')}
                      >
                        <Text style={[styles.sortChipText, reviewSort === 'recent' && styles.sortChipTextActive]}>Most Recent</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sortChip, reviewSort === 'helpful' && styles.sortChipActive]}
                        onPress={() => setReviewSort('helpful')}
                      >
                        <Text style={[styles.sortChipText, reviewSort === 'helpful' && styles.sortChipTextActive]}>Most Helpful</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {/* Filtered Reviews */}
                  {reviews
                    .filter((r) => reviewFilter === 0 || Math.round(r.rating) === reviewFilter)
                    .sort((a, b) => reviewSort === 'recent'
                      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      : (b.verifiedPurchase ? 1 : 0) - (a.verifiedPurchase ? 1 : 0)
                    )
                    .slice(0, 5)
                    .map((review) => (
                    <View key={review._id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewAuthor}>{review.userId?.name || 'User'}</Text>
                        <View style={styles.reviewStars}>{[1, 2, 3, 4, 5].map((s) => <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={14} color={colors.secondary} />)}</View>
                      </View>
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}>
                        {review.verifiedPurchase && <Text style={styles.verified}>Verified Purchase</Text>}
                        <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                      </View>
                    </View>
                  ))}
                  {reviews.filter((r) => reviewFilter === 0 || Math.round(r.rating) === reviewFilter).length === 0 && (
                    <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }}>No {reviewFilter}-star reviews yet</Text>
                  )}
                </StaggeredView>
              )}

              {/* Frequently Bought Together */}
              {similarProducts.length >= 2 && (
                <View style={{ marginTop: spacing.lg }}>
                  <FrequentlyBoughtTogether
                    currentProduct={product}
                    similarProducts={similarProducts}
                    onAddAllToCart={handleAddAllToCart}
                  />
                </View>
              )}

              {/* Similar Products */}
              {similarProducts.length > 0 && (
                <StaggeredView delay={300}>
                  <View style={styles.sectionTitleWrapper}><Text style={styles.sectionTitle}>You May Also Like</Text><View style={styles.sectionAccent} /></View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
                    {similarProducts.map((item, index) => (
                      <View key={`sim-${item._id}`} style={{ marginRight: spacing.md }}><AnimatedProductCard product={item} index={index} /></View>
                    ))}
                  </ScrollView>
                </StaggeredView>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar: Wishlist + Add to Cart + Buy Now */}
      <SlideUpView style={styles.bottomBar}>
        <TouchableOpacity style={styles.wishlistButton} onPress={handleWishlist}>
          <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={24} color={isWishlisted ? colors.error : colors.primary} />
        </TouchableOpacity>
        <Button title={(product.stock ?? 0) > 0 ? 'Add to Cart' : 'Out of Stock'} onPress={handleAddToCart} disabled={!product.stock} variant="outline" size="lg" style={{ flex: 1 }} />
        <Button title="Buy Now" onPress={handleBuyNow} disabled={!product.stock} size="lg" style={{ flex: 1 }} />
      </SlideUpView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.background },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' as const },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryBtnText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  image: { width, height: width },
  shareBtn: { position: 'absolute', top: spacing.xl + spacing.md, right: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.full, padding: spacing.sm + 2, ...shadows.md },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.sm, gap: spacing.xs + 2 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  info: { padding: spacing.md },
  brand: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: letterSpacing.wide, marginBottom: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, letterSpacing: letterSpacing.tight },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 2 },
  ratingText: { marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  price: { fontSize: fontSize.xxxl, fontWeight: fontWeight.extrabold, color: colors.primary, letterSpacing: letterSpacing.tight },
  compareAt: { fontSize: fontSize.lg, color: colors.textSecondary, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
  discountText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  saveText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold },
  urgencyBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  urgencyText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#92400E', flex: 1 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  deliveryBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.infoLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  deliveryText: { fontSize: fontSize.xs, color: colors.info, fontWeight: fontWeight.semibold },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginTop: spacing.md, gap: spacing.md, ...shadows.sm },
  sellerIcon: { width: 36, height: 36, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  sellerName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  sellerMeta: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.medium },
  highlightsCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  highlightText: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  variantLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
  variantOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  variantChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  variantChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  variantChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  variantChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  qtySection: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  qtyLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  qtyBtn: { width: 36, height: 36, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.primaryLighter, justifyContent: 'center', alignItems: 'center' },
  qtyValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, minWidth: 30, textAlign: 'center', color: colors.text },
  sectionTitleWrapper: { marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  sectionAccent: { width: 24, height: 3, backgroundColor: colors.primary, borderRadius: 2, marginTop: 4 },
  specsCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.sm },
  specRow: { flexDirection: 'row', paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  specBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  specLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  specValue: { flex: 1.5, fontSize: fontSize.sm, color: colors.textSecondary },
  descriptionCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  descHeading: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  descParagraph: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.sm },
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
  reviewCard: { backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.xl, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.primary, ...shadows.sm },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  reviewStars: { flexDirection: 'row' },
  reviewComment: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  verified: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold, marginTop: spacing.xs },
  bottomBar: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, gap: spacing.sm, alignItems: 'center', ...shadows.xl },
  wishlistButton: { width: 44, height: 44, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.primaryLighter, justifyContent: 'center', alignItems: 'center' },
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  zoomClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: spacing.sm },
  zoomHint: { color: 'rgba(255,255,255,0.5)', fontSize: fontSize.xs, textAlign: 'center', paddingBottom: spacing.xl },
});
