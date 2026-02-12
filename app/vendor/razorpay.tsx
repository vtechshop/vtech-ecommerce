import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vendorApi } from '../../src/api/vendor';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

export default function VendorRazorpay() {
  const { isReady } = useAuthGuard([ROLES.VENDOR, ROLES.ADMIN]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bank details for Razorpay linked account
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [businessType, setBusinessType] = useState('');

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await vendorApi.getRazorpayStatus();
      const status = data.data as any;
      setConnected(status?.connected ?? false);
      // Pre-fill if data exists
      if (status?.accountName) setAccountName(status.accountName);
      if (status?.accountNumber) setAccountNumber(status.accountNumber);
      if (status?.ifsc) setIfsc(status.ifsc);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load Razorpay status');
    }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleConnect = async () => {
    if (!accountName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      Alert.alert('Required', 'Please fill in all bank account details to connect Razorpay');
      return;
    }

    setConnecting(true);
    try {
      await vendorApi.connectRazorpay({
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        businessType: businessType.trim() || 'individual',
      });
      Alert.alert('Success', 'Razorpay account connected successfully');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to connect Razorpay account');
    }
    setConnecting(false);
  };

  if (!isReady || loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.statusCard}>
        <View style={[styles.iconCircle, { backgroundColor: connected ? colors.success + '20' : colors.warning + '20' }]}>
          <Ionicons name={connected ? 'checkmark-circle' : 'card-outline'} size={48} color={connected ? colors.success : colors.warning} />
        </View>
        <Text style={styles.statusLabel}>{connected ? 'Connected' : 'Not Connected'}</Text>
        <Text style={styles.statusDesc}>
          {connected
            ? 'Your Razorpay account is linked. Payouts will be processed automatically.'
            : 'Connect your Razorpay account to receive payouts for your sales.'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        {[
          'Customer pays via Razorpay at checkout',
          'Payment is held in escrow',
          'After delivery confirmation, payout is initiated',
          'Funds are transferred to your linked account',
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Bank Details Form */}
      {!connected && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Bank Account Details</Text>
          <Text style={styles.formDesc}>
            Enter your bank details to create a Razorpay linked account for receiving payouts.
          </Text>

          <Text style={styles.label}>Account Holder Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name as per bank"
            value={accountName}
            onChangeText={setAccountName}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Account Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter account number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="number-pad"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>IFSC Code *</Text>
          <TextInput
            style={styles.input}
            placeholder="SBIN0001234"
            value={ifsc}
            onChangeText={setIfsc}
            autoCapitalize="characters"
            maxLength={11}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Business Type</Text>
          <TextInput
            style={styles.input}
            placeholder="individual / partnership / company"
            value={businessType}
            onChangeText={setBusinessType}
            autoCapitalize="none"
            placeholderTextColor={colors.textSecondary}
          />

          <Button
            title="Connect Razorpay Account"
            onPress={handleConnect}
            loading={connecting}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      )}

      {/* Connected Details */}
      {connected && accountName ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Linked Account</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{accountName}</Text>
          </View>
          {accountNumber ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account</Text>
              <Text style={styles.detailValue}>****{accountNumber.slice(-4)}</Text>
            </View>
          ) : null}
          {ifsc ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>IFSC</Text>
              <Text style={styles.detailValue}>{ifsc}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  statusCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', ...shadows.sm },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  statusLabel: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.sm },
  statusDesc: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.error, flex: 1 },
  infoCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginTop: spacing.md, ...shadows.sm },
  infoTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  stepText: { flex: 1, fontSize: fontSize.md, color: colors.text, lineHeight: 20 },
  formCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginTop: spacing.md, ...shadows.sm },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  formDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.surface },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
});
