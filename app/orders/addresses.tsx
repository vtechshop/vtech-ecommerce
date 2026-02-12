import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../src/api/user';
import { Address } from '../../src/types';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const emptyAddress: Omit<Address, '_id'> = {
  fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', country: 'India',
};

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddress);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await userApi.getAddresses();
      setAddresses(data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'Something went wrong'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleSave = async () => {
    if (!form.fullName || !form.phone || !form.addressLine1 || !form.city || !form.state || !form.pincode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await userApi.updateAddress(editId, form);
      } else {
        await userApi.addAddress(form as Address);
      }
      setShowForm(false);
      setForm(emptyAddress);
      setEditId(null);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to save address');
    }
    setSaving(false);
  };

  const handleEdit = (addr: Address) => {
    setForm(addr);
    setEditId(addr._id || null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await userApi.deleteAddress(id);
            setAddresses((prev) => prev.filter((a) => a._id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete address');
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await userApi.setDefaultAddress(id);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  if (loading) return <LoadingScreen />;

  if (showForm) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>{editId ? 'Edit Address' : 'New Address'}</Text>
          {[
            { key: 'fullName', label: 'Full Name', required: true },
            { key: 'phone', label: 'Phone', required: true, keyboard: 'phone-pad' as const },
            { key: 'addressLine1', label: 'Address Line 1', required: true },
            { key: 'addressLine2', label: 'Address Line 2' },
            { key: 'city', label: 'City', required: true },
            { key: 'state', label: 'State', required: true },
            { key: 'pincode', label: 'Pincode', required: true, keyboard: 'numeric' as const },
          ].map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
              <TextInput
                style={styles.input}
                value={(form as any)[field.key]}
                onChangeText={(val) => setForm((prev) => ({ ...prev, [field.key]: val }))}
                placeholder={field.label}
                keyboardType={field.keyboard || 'default'}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          ))}
          <View style={styles.formActions}>
            <Button title="Cancel" variant="outline" onPress={() => { setShowForm(false); setEditId(null); setForm(emptyAddress); }} style={{ flex: 1 }} />
            <Button title="Save" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={addresses}
      keyExtractor={(item) => item._id || ''}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      ListHeaderComponent={
        <Button title="Add New Address" variant="outline" onPress={() => setShowForm(true)} style={{ marginBottom: spacing.md }}
          icon={<Ionicons name="add" size={18} color={colors.primary} />}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="location-outline" size={80} color={colors.border} />
          <Text style={styles.emptyTitle}>No addresses saved</Text>
          <Text style={styles.emptyText}>Add your first delivery address</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, item.isDefault && styles.cardDefault]}>
          {item.isDefault && (
            <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>
          )}
          <Text style={styles.addressName}>{item.fullName}</Text>
          <Text style={styles.addressLine}>{item.addressLine1}{item.addressLine2 ? `, ${item.addressLine2}` : ''}</Text>
          <Text style={styles.addressLine}>{item.city}, {item.state} - {item.pincode}</Text>
          <Text style={styles.addressLine}>{item.phone}</Text>
          <View style={styles.cardActions}>
            {!item.isDefault && (
              <TouchableOpacity onPress={() => handleSetDefault(item._id!)} style={styles.actionBtn}>
                <Ionicons name="star-outline" size={16} color={colors.primary} />
                <Text style={styles.actionText}>Set Default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
              <Ionicons name="create-outline" size={16} color={colors.info} />
              <Text style={[styles.actionText, { color: colors.info }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id!)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  cardDefault: { borderWidth: 2, borderColor: colors.primary },
  defaultBadge: { alignSelf: 'flex-start', backgroundColor: colors.primaryLightest, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  defaultText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  addressName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  addressLine: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  formContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  formTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.white },
  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
