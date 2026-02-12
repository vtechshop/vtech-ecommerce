import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import { User } from '../../src/types';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const ROLE_TABS = ['all', 'customer', 'vendor', 'affiliate', 'admin'];
const roleColors: Record<string, string> = {
  customer: colors.info, vendor: '#8B5CF6', affiliate: '#EC4899', admin: colors.error, support: colors.warning,
};

export default function AdminUsers() {
  const { isReady } = useAuthGuard([ROLES.ADMIN]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async (role?: string, searchQuery?: string) => {
    setError(null);
    try {
      const params: any = {};
      if (role && role !== 'all') params.role = role;
      if (searchQuery) params.search = searchQuery;
      const { data } = await adminApi.getUsers(params);
      setUsers(data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(activeTab, search); }, [isReady, activeTab]);
  const onRefresh = async () => { setRefreshing(true); await loadData(activeTab, search); setRefreshing(false); };

  const handleSearch = () => { setLoading(true); loadData(activeTab, search); };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete User', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminApi.deleteUser(id);
            setUsers((prev) => prev.filter((u) => u._id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete user');
          }
        },
      },
    ]);
  };

  if (!isReady || loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <FlatList
        horizontal
        data={ROLE_TABS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === item && styles.tabActive]}
            onPress={() => { setLoading(true); setActiveTab(item); }}
          >
            <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={60} color={colors.border} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: (roleColors[item.role] || colors.textSecondary) + '20' }]}>
                  <Text style={[styles.roleText, { color: roleColors[item.role] || colors.textSecondary }]}>{item.role}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item._id, item.name)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, margin: spacing.md, marginBottom: 0, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 2, paddingLeft: spacing.sm, fontSize: fontSize.md, color: colors.text },
  tabBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.white },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: fontSize.lg },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  userName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  userEmail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginTop: spacing.xs },
  roleText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  deleteBtn: { padding: spacing.sm },
});
