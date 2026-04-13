import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as IntentLauncher from 'expo-intent-launcher';
import { productsApi } from '../../src/api/products';
import { Product } from '../../src/types';
import AnimatedProductCard from '../../src/components/product/AnimatedProductCard';
import { useRecentSearches } from '../../src/hooks/useRecentSearches';
import { haptic } from '../../src/utils/haptics';
import { useToast } from '../../src/components/ui/Toast';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const PAGE_LIMIT = 20;
const SORT_OPTIONS = [
  { label: 'Relevance', value: '' },
  { label: 'Price: Low to High', value: 'price' },
  { label: 'Price: High to Low', value: '-price' },
  { label: 'Rating', value: '-rating' },
  { label: 'Newest First', value: '-createdAt' },
  { label: 'Most Reviews', value: '-reviewCount' },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [rawResults, setRawResults] = useState<Product[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortBy, setSortBy] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  // Active filters
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  // Staged filters (edited in modal, applied on confirm)
  const [stagedMinPrice, setStagedMinPrice] = useState('');
  const [stagedMaxPrice, setStagedMaxPrice] = useState('');
  const [stagedMinRating, setStagedMinRating] = useState(0);
  const [stagedInStock, setStagedInStock] = useState(false);
  const { searches: recentSearches, addSearch, removeSearch, clearAll: clearRecentSearches } = useRecentSearches();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { showToast } = useToast();
  const inputRef = useRef<TextInput>(null);

  // Voice search — uses Android system speech recognition intent (same as Amazon/Flipkart)
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = async () => {
    haptic.light();
    if (Platform.OS !== 'android') {
      showToast('info', 'Voice search is available on Android only');
      return;
    }
    setIsListening(true);
    try {
      const result = await IntentLauncher.startActivityAsync(
        'android.speech.action.RECOGNIZE_SPEECH',
        {
          extra: {
            'android.speech.extra.LANGUAGE_MODEL': 'free_form',
            'android.speech.extra.LANGUAGE': 'en-IN',
            'android.speech.extra.PROMPT': 'Search V-Tech Kitchen...',
            'android.speech.extra.MAX_RESULTS': 1,
          },
        }
      );
      // RESULT_OK = -1 on Android
      if (result.resultCode === -1) {
        const recognized = (result.data as any)?.['android.speech.extra.RESULTS']?.[0];
        if (recognized) {
          haptic.success();
          setQuery(recognized);
          doSearch(recognized, 1, sortBy);
        }
      }
    } catch {
      showToast('error', 'Voice search unavailable', 'Make sure Google app is installed');
    }
    setIsListening(false);
  };

  const handleCameraSearch = async () => {
    haptic.light();
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showToast('error', 'Camera permission required');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setShowCamera(false);
    haptic.success();
    setQuery(data);
    showToast('info', 'Barcode scanned', `Searching for: ${data}`);
    doSearch(data, 1, sortBy);
  };

  const doSearch = async (q: string, pageNum: number, sort: string) => {
    if (!q.trim()) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const params: any = { q, page: pageNum, limit: PAGE_LIMIT };
      if (sort) params.sort = sort;
      const { data } = await productsApi.getAll(params);
      const items = data.data || [];
      const allItems = pageNum === 1 ? items : [...rawResults, ...items];
      if (pageNum === 1) { setRawResults(items); setResults(applyClientFilters(items)); addSearch(q.trim()); }
      else { setRawResults(allItems); setResults(applyClientFilters(allItems)); }
      setHasMore(items.length >= PAGE_LIMIT);
      setPage(pageNum);
      setSearched(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
    setLoadingMore(false);
  };

  const handleSearch = () => { setPage(1); setHasMore(true); doSearch(query, 1, sortBy); };
  const handleLoadMore = () => { if (!loadingMore && hasMore && !loading) doSearch(query, page + 1, sortBy); };

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const { data } = await productsApi.autocomplete(text.trim());
          setSuggestions(data.data?.suggestions || []);
          setShowSuggestions(true);
        } catch { setSuggestions([]); }
      }, 300);
    } else { setSuggestions([]); setShowSuggestions(false); }
  }, []);

  const selectSuggestion = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
    setSuggestions([]);
    setPage(1);
    setHasMore(true);
    doSearch(s, 1, sortBy);
  };

  const applySort = (value: string) => {
    setSortBy(value);
    setShowSort(false);
    if (searched && query.trim()) { setPage(1); setHasMore(true); doSearch(query, 1, value); }
  };

  const activeFilterCount = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating > 0 ? 1 : 0) + (inStockOnly ? 1 : 0);

  const applyClientFilters = (items: Product[]) => {
    let filtered = items;
    if (minPrice) filtered = filtered.filter((p) => (p.price ?? 0) >= Number(minPrice));
    if (maxPrice) filtered = filtered.filter((p) => (p.price ?? 0) <= Number(maxPrice));
    if (minRating > 0) filtered = filtered.filter((p) => (p.rating ?? 0) >= minRating);
    if (inStockOnly) filtered = filtered.filter((p) => (p.stock ?? 1) > 0);
    return filtered;
  };

  const openFilter = () => {
    setStagedMinPrice(minPrice);
    setStagedMaxPrice(maxPrice);
    setStagedMinRating(minRating);
    setStagedInStock(inStockOnly);
    setShowFilter(true);
  };

  const applyFilters = () => {
    const newMin = stagedMinPrice;
    const newMax = stagedMaxPrice;
    const newRating = stagedMinRating;
    const newInStock = stagedInStock;
    setMinPrice(newMin);
    setMaxPrice(newMax);
    setMinRating(newRating);
    setInStockOnly(newInStock);
    setShowFilter(false);
    // Re-apply to current raw results immediately
    let filtered = rawResults;
    if (newMin) filtered = filtered.filter((p) => (p.price ?? 0) >= Number(newMin));
    if (newMax) filtered = filtered.filter((p) => (p.price ?? 0) <= Number(newMax));
    if (newRating > 0) filtered = filtered.filter((p) => (p.rating ?? 0) >= newRating);
    if (newInStock) filtered = filtered.filter((p) => (p.stock ?? 1) > 0);
    setResults(filtered);
  };

  const clearFilters = () => {
    setStagedMinPrice('');
    setStagedMaxPrice('');
    setStagedMinRating(0);
    setStagedInStock(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.primary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search products..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleQueryChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); setSuggestions([]); setShowSuggestions(false); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleVoiceSearch} style={styles.searchAction}>
          <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={20} color={isListening ? colors.error : colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCameraSearch} style={styles.searchAction}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Camera/Barcode Scanner Modal */}
      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={{ flex: 1, backgroundColor: colors.black }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraHint}>Point camera at a barcode or product</Text>
            <TouchableOpacity style={styles.cameraClose} onPress={() => setShowCamera(false)}>
              <Ionicons name="close-circle" size={40} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Autocomplete */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.slice(0, 6).map((s, i) => (
            <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => selectSuggestion(s)}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sort & Filter */}
      {searched && !loading && results.length > 0 && (
        <View style={styles.controlBar}>
          <Text style={styles.resultCount}>{results.length}{hasMore ? '+' : ''} results</Text>
          <View style={styles.controlActions}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setShowSort(true)}>
              <Ionicons name="swap-vertical" size={16} color={colors.primary} />
              <Text style={styles.controlBtnText}>Sort</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={openFilter}>
              <Ionicons name="options" size={16} color={colors.primary} />
              <Text style={styles.controlBtnText}>Filter</Text>
              {activeFilterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sort Modal */}
      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sort By</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value} style={[styles.sortOption, sortBy === opt.value && styles.sortOptionActive]} onPress={() => applySort(opt.value)}>
                <Text style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionTextActive]}>{opt.label}</Text>
                {sortBy === opt.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Price Range */}
            <Text style={styles.filterLabel}>Price Range (₹)</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={stagedMinPrice}
                onChangeText={setStagedMinPrice}
              />
              <Text style={styles.priceDash}>—</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={stagedMaxPrice}
                onChangeText={setStagedMaxPrice}
              />
            </View>

            {/* Rating Filter */}
            <Text style={styles.filterLabel}>Minimum Rating</Text>
            <View style={styles.ratingRow}>
              {[0, 3, 4, 4.5].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.ratingChip, stagedMinRating === r && styles.ratingChipActive]}
                  onPress={() => setStagedMinRating(r)}
                >
                  <Ionicons name="star" size={12} color={stagedMinRating === r ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.ratingChipText, stagedMinRating === r && styles.ratingChipTextActive]}>
                    {r === 0 ? 'Any' : `${r}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* In Stock Toggle */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark }}
              onPress={() => setStagedInStock(!stagedInStock)}
            >
              <Text style={styles.filterLabel}>In Stock Only</Text>
              <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: stagedInStock ? colors.primary : colors.border, justifyContent: 'center', paddingHorizontal: 2 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, alignSelf: stagedInStock ? 'flex-end' : 'flex-start' }} />
              </View>
            </TouchableOpacity>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => setShowFilter(false)}>
                <Text style={styles.clearBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Content */}
      {loading ? (
        <View style={styles.empty}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.emptyText}>Searching...</Text></View>
      ) : error ? (
        <View style={styles.empty}><Ionicons name="alert-circle-outline" size={48} color={colors.error} /><Text style={styles.emptyText}>{error}</Text></View>
      ) : !searched ? (
        <View style={styles.empty}>
          {recentSearches.length > 0 ? (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}><Text style={styles.clearText}>Clear All</Text></TouchableOpacity>
              </View>
              {recentSearches.map((s, i) => (
                <TouchableOpacity key={i} style={styles.recentItem} onPress={() => selectSuggestion(s)}>
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.recentItemText}>{s}</Text>
                  <TouchableOpacity onPress={() => removeSearch(s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.emptyIconCircle}><Ionicons name="search" size={32} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>Search Products</Text>
              <Text style={styles.emptyText}>Type a product name and press search</Text>
            </>
          )}
        </View>
      ) : results.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}><Ionicons name="search-outline" size={32} color={colors.primary} /></View>
          <Text style={styles.emptyText}>No results for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          columnWrapperStyle={styles.row}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          renderItem={({ item, index }) => <AnimatedProductCard product={item} index={index} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.footerText}>Loading more...</Text></View>
            ) : !hasMore && results.length > 0 ? (
              <View style={styles.footer}><Text style={styles.footerText}>All results loaded</Text></View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, margin: spacing.md, marginBottom: 0, paddingHorizontal: spacing.md, borderRadius: borderRadius.xxl, borderWidth: 1.5, borderColor: colors.primaryLighter, gap: spacing.sm, ...shadows.md },
  input: { flex: 1, paddingVertical: spacing.sm + 2, fontSize: fontSize.md, color: colors.text },
  suggestionsBox: { backgroundColor: colors.white, marginHorizontal: spacing.md, borderRadius: borderRadius.xl, ...shadows.md, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  suggestionText: { fontSize: fontSize.md, color: colors.text },
  controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  resultCount: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  controlActions: { flexDirection: 'row', gap: spacing.sm },
  controlBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primaryLighter },
  controlBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  filterBadge: { backgroundColor: colors.error, borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { fontSize: 10, color: colors.white, fontWeight: fontWeight.bold },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.lg, paddingBottom: spacing.xxl + spacing.md, maxHeight: '85%', ...shadows.xl },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  sortOptionActive: { backgroundColor: colors.primaryLightest, marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg },
  sortOptionText: { fontSize: fontSize.md, color: colors.text },
  sortOptionTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  filterLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md, color: colors.text },
  priceDash: { fontSize: fontSize.lg, color: colors.textSecondary },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border },
  ratingChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  ratingChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  ratingChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  filterActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  clearBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  clearBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  applyBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.xl, backgroundColor: colors.primary, alignItems: 'center' },
  applyBtnText: { fontSize: fontSize.md, color: colors.white, fontWeight: fontWeight.semibold },
  recentSection: { width: '100%', paddingHorizontal: spacing.md },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  recentTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  clearText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  recentItemText: { flex: 1, fontSize: fontSize.md, color: colors.text },
  row: { justifyContent: 'space-between' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs, fontWeight: fontWeight.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
  searchAction: { padding: spacing.xs },
  cameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: spacing.xxl, paddingTop: spacing.md, backgroundColor: 'rgba(0,0,0,0.4)' },
  cameraHint: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.medium, marginBottom: spacing.md },
  cameraClose: { marginTop: spacing.sm },
});
