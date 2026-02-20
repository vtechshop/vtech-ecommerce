import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { userApi } from '../../src/api/user';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';
import { Product } from '../../src/types';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { useToast } from '../../src/components/ui/Toast';
import { haptic } from '../../src/utils/haptics';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SortOption = 'default' | 'price-low' | 'price-high' | 'name';

interface WishlistFolder {
  id: string;
  name: string;
  items: string[];
}

const LISTS_KEY = '@vtech_wishlists';
const PRICES_KEY = '@vtech_price_tracker';

function AnimatedEmptyWishlist({ isAuthenticated }: { isAuthenticated: boolean }) {
  const iconScale = useSharedValue(0);
  const heartBeat = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(100, withSpring(1, { damping: 8, stiffness: 150 }));
    heartBeat.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(1.15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.1, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ), -1, false
    ));
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value * heartBeat.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));

  return (
    <View style={styles.empty}>
      <Animated.View style={[styles.emptyIconCircle, iconStyle]}>
        <Ionicons name="heart-outline" size={40} color={colors.primaryLight} />
      </Animated.View>
      <Animated.Text style={[styles.emptyTitle, titleStyle]}>
        {isAuthenticated ? 'Your wishlist is empty' : 'Login to view wishlist'}
      </Animated.Text>
      {isAuthenticated && (
        <Animated.Text style={[styles.emptySubtext, subtitleStyle]}>
          Save items you love here
        </Animated.Text>
      )}
    </View>
  );
}

function AnimatedHeartBtn({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    haptic.light();
    scale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 400 }),
      withSpring(0.8, { damping: 6, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    onPress();
  };

  return (
    <AnimatedPressable style={[styles.removeWishlistBtn, animStyle]} onPress={handlePress}>
      <Ionicons name="heart-dislike-outline" size={16} color={colors.error} />
    </AnimatedPressable>
  );
}

function AnimatedMoveToCartBtn({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.moveToCartBtn, animStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      <Ionicons name="cart-outline" size={16} color={colors.white} />
      <Text style={styles.moveToCartText}>Move to Cart</Text>
    </AnimatedPressable>
  );
}

function AnimatedWishlistCard({ item, onRemove, onMoveToCart, onAddToList, priceDrop, lists }: {
  item: Product;
  onRemove: () => void;
  onMoveToCart: () => void;
  onAddToList?: (listId: string) => void;
  priceDrop?: number;
  lists: WishlistFolder[];
}) {
  const cardScale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.wishlistCard, cardStyle]}
      onPressIn={() => { cardScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { cardScale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      onPress={() => router.push(`/product/${item._id}`)}
    >
      <View style={styles.cardContent}>
        {item.images?.[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={24} color={colors.border} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardRating}>
            <Ionicons name="star" size={12} color={colors.secondary} />
            <Text style={styles.ratingText}>{(item.rating ?? 0).toFixed(1)}</Text>
          </View>
          <View style={styles.cardPriceRow}>
            <Text style={styles.cardPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
            {item.compareAt && <Text style={styles.cardCompare}>₹{item.compareAt.toLocaleString()}</Text>}
          </View>
          {priceDrop != null && priceDrop > 0 && (
            <View style={styles.priceDropBadge}>
              <Ionicons name="trending-down" size={12} color={colors.success} />
              <Text style={styles.priceDropText}>Price dropped ₹{priceDrop.toLocaleString()}!</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        <AnimatedMoveToCartBtn onPress={onMoveToCart} />
        {lists.length > 0 && onAddToList && (
          <TouchableOpacity
            style={styles.addToListBtn}
            onPress={() => {
              Alert.alert('Add to List', 'Choose a list:', lists.map((l) => ({
                text: l.name, onPress: () => onAddToList(l.id),
              })).concat({ text: 'Cancel', onPress: () => {} }));
            }}
          >
            <Ionicons name="folder-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
        <AnimatedHeartBtn onPress={onRemove} />
      </View>
    </AnimatedPressable>
  );
}

export default function WishlistScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [lists, setLists] = useState<WishlistFolder[]>([]);
  const [activeList, setActiveList] = useState('all');
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [priceDrops, setPriceDrops] = useState<Record<string, number>>({});
  const { showToast } = useToast();

  const loadWishlist = async () => {
    setError(null);
    try {
      const { data } = await userApi.getWishlist();
      const items = data.data || [];
      setProducts(items);
      // Check for price drops
      checkPriceDrops(items);
    } catch (e: any) { setError(e.response?.data?.message || 'Something went wrong'); }
    setLoading(false);
  };

  const loadLists = async () => {
    try {
      const stored = await AsyncStorage.getItem(LISTS_KEY);
      if (stored) setLists(JSON.parse(stored));
    } catch {}
  };

  const saveLists = async (updated: WishlistFolder[]) => {
    setLists(updated);
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(updated));
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    haptic.success();
    const newList: WishlistFolder = { id: Date.now().toString(), name: newListName.trim(), items: [] };
    await saveLists([...lists, newList]);
    setNewListName('');
    setShowNewList(false);
    showToast('success', 'List Created', newList.name);
  };

  const deleteList = (listId: string) => {
    Alert.alert('Delete List', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        haptic.warning();
        saveLists(lists.filter((l) => l.id !== listId));
        if (activeList === listId) setActiveList('all');
        showToast('info', 'List deleted');
      }},
    ]);
  };

  const addToList = (listId: string, productId: string) => {
    haptic.light();
    const updated = lists.map((l) =>
      l.id === listId
        ? { ...l, items: l.items.includes(productId) ? l.items : [...l.items, productId] }
        : l
    );
    saveLists(updated);
    showToast('success', 'Added to list');
  };

  const checkPriceDrops = async (items: Product[]) => {
    try {
      const stored = await AsyncStorage.getItem(PRICES_KEY);
      const savedPrices: Record<string, number> = stored ? JSON.parse(stored) : {};
      const drops: Record<string, number> = {};
      const newPrices: Record<string, number> = {};
      items.forEach((p) => {
        newPrices[p._id] = p.price;
        if (savedPrices[p._id] && p.price < savedPrices[p._id]) {
          drops[p._id] = savedPrices[p._id] - p.price;
        }
      });
      setPriceDrops(drops);
      await AsyncStorage.setItem(PRICES_KEY, JSON.stringify(newPrices));
      const dropCount = Object.keys(drops).length;
      if (dropCount > 0) {
        showToast('success', 'Price Drop!', `${dropCount} item${dropCount > 1 ? 's' : ''} in your wishlist dropped in price!`);
      }
    } catch {}
  };

  useEffect(() => {
    if (isAuthenticated) loadWishlist();
    else setLoading(false);
    loadLists();
  }, [isAuthenticated]);

  const removeItem = async (productId: string) => {
    try {
      await userApi.removeFromWishlist(productId);
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch {
      showToast('error', 'Error', 'Failed to remove item from wishlist');
    }
  };

  const moveToCart = async (product: Product) => {
    if (!isAuthenticated) return;
    haptic.medium();
    const result = await dispatch(addToCart({ productId: product._id, quantity: 1 }));
    if (addToCart.fulfilled.match(result)) {
      await userApi.removeFromWishlist(product._id);
      setProducts((prev) => prev.filter((p) => p._id !== product._id));
      showToast('success', 'Moved to Cart', product.title);
    } else {
      showToast('error', 'Error', 'Failed to add to cart');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    return 0;
  });

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <View style={styles.empty}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.emptyTitle}>{error}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); loadWishlist(); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated || products.length === 0) {
    return <AnimatedEmptyWishlist isAuthenticated={isAuthenticated} />;
  }

  const filteredProducts = activeList === 'all'
    ? sortedProducts
    : sortedProducts.filter((p) => lists.find((l) => l.id === activeList)?.items.includes(p._id));

  return (
    <View style={styles.container}>
      {/* List Tabs */}
      <FlatList
        data={[{ id: 'all', name: 'All Items' }, ...lists]}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.listTabs}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          <TouchableOpacity style={styles.addListBtn} onPress={() => setShowNewList(true)}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addListText}>New List</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.listTab, activeList === item.id && styles.listTabActive]}
            onPress={() => setActiveList(item.id)}
            onLongPress={() => item.id !== 'all' && deleteList(item.id)}
          >
            <Text style={[styles.listTabText, activeList === item.id && styles.listTabTextActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Sort Options */}
      <View style={styles.sortRow}>
        <Text style={styles.countText}>{filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}</Text>
        <View style={styles.sortChips}>
          {([
            { label: 'Default', value: 'default' as SortOption },
            { label: 'Price ↑', value: 'price-low' as SortOption },
            { label: 'Price ↓', value: 'price-high' as SortOption },
            { label: 'Name', value: 'name' as SortOption },
          ]).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortChip, sortBy === opt.value && styles.sortChipActive]}
              onPress={() => setSortBy(opt.value)}
            >
              <Text style={[styles.sortChipText, sortBy === opt.value && styles.sortChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* New List Modal */}
      <Modal visible={showNewList} transparent animationType="fade" onRequestClose={() => setShowNewList(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New List</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="List name (e.g., Birthday, Home)"
              placeholderTextColor={colors.textSecondary}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowNewList(false); setNewListName(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={createList}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        style={{ flex: 1 }}
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => (
          <AnimatedWishlistCard
            item={item}
            onRemove={() => removeItem(item._id)}
            onMoveToCart={() => moveToCart(item)}
            onAddToList={(listId) => addToList(listId, item._id)}
            priceDrop={priceDrops[item._id]}
            lists={lists}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listTabs: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  listTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignSelf: 'center' },
  listTabActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  listTabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  listTabTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  addListBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignSelf: 'center' },
  addListText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  priceDropBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  priceDropText: { fontSize: 10, color: colors.success, fontWeight: fontWeight.bold },
  addToListBtn: { paddingHorizontal: spacing.md, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryLightest },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.lg, width: '85%', ...shadows.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md },
  modalCancelBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  modalCreateBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  modalCreateText: { fontSize: fontSize.sm, color: colors.white, fontWeight: fontWeight.semibold },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  countText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  sortChips: { flexDirection: 'row', gap: spacing.xs },
  sortChip: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  sortChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  sortChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  // Wishlist card
  wishlistCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, marginBottom: spacing.md, overflow: 'hidden', ...shadows.sm },
  cardContent: { flexDirection: 'row', padding: spacing.md },
  cardImage: { width: 80, height: 80, borderRadius: borderRadius.lg },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  cardRating: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
  ratingText: { fontSize: fontSize.xs, color: colors.textSecondary },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  cardPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  cardCompare: { fontSize: fontSize.sm, color: colors.textSecondary, textDecorationLine: 'line-through' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.surfaceDark },
  moveToCartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, backgroundColor: colors.primary },
  moveToCartText: { fontSize: fontSize.sm, color: colors.white, fontWeight: fontWeight.semibold },
  removeWishlistBtn: { paddingHorizontal: spacing.lg, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.errorLight },
  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptySubtext: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
});
