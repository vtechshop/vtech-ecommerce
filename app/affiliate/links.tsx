import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, Share, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { affiliateApi } from '../../src/api/affiliate';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const SITE_URL = 'https://vtechkitchen.com';

export default function AffiliateLinks() {
  const { isReady } = useAuthGuard([ROLES.AFFILIATE, ROLES.ADMIN]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [productId, setProductId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await affiliateApi.getLinks();
      setLinks(data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load affiliate links');
    }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const getShareUrl = (item: any): string => {
    if (item.url) return item.url;
    if (item.shortUrl) return item.shortUrl;
    if (item.code) return `${SITE_URL}?ref=${item.code}`;
    if (item.slug) return `${SITE_URL}/product/${item.slug}?ref=${item.affiliateCode || ''}`;
    return SITE_URL;
  };

  const handleShare = async (item: any) => {
    const url = getShareUrl(item);
    try {
      await Share.share({
        message: `Check out this product on V-Tech Kitchen: ${url}`,
        url,
      });
    } catch (e: any) {
      if (e.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share link');
      }
    }
  };

  const handleCopy = (item: any) => {
    const url = getShareUrl(item);
    Alert.alert('Your Link', url, [
      { text: 'Share', onPress: () => handleShare(item) },
      { text: 'OK' },
    ]);
  };

  const handleCreateLink = async () => {
    if (!productId.trim()) {
      Alert.alert('Required', 'Please enter a product ID');
      return;
    }
    setCreating(true);
    try {
      await affiliateApi.createLink(productId.trim());
      setShowModal(false);
      setProductId('');
      Alert.alert('Success', 'Affiliate link created');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create link');
    }
    setCreating(false);
  };

  if (!isReady || loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={links}
        keyExtractor={(item, i) => item._id || String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        ListHeaderComponent={
          <>
            <Button
              title="Create New Link"
              onPress={() => setShowModal(true)}
              variant="outline"
              style={{ marginBottom: spacing.md }}
              icon={<Ionicons name="add" size={18} color={colors.primary} />}
            />
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="link-outline" size={80} color={colors.border} />
            <Text style={styles.emptyTitle}>No affiliate links</Text>
            <Text style={styles.emptyText}>Create your first affiliate link to start earning</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.linkIcon}>
                <Ionicons name="link" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.linkUrl} numberOfLines={1}>{getShareUrl(item)}</Text>
                <Text style={styles.linkMeta}>
                  Clicks: {item.clicks ?? 0} | Conversions: {item.conversions ?? 0}
                </Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleCopy(item)} style={styles.actionBtn}>
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleShare(item)} style={styles.actionBtn}>
                <Ionicons name="share-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Affiliate Link</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalDesc}>
              Enter the product ID to generate an affiliate link. You can find the product ID on the product page.
            </Text>
            <Text style={styles.fieldLabel}>Product ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 6789abc123def456"
              value={productId}
              onChangeText={setProductId}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            <Button
              title="Generate Link"
              onPress={handleCreateLink}
              loading={creating}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.error, flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  linkIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  linkUrl: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  linkMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.white, ...shadows.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  modalContent: { padding: spacing.md },
  modalDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.white },
});
